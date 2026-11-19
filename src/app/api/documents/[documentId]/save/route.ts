import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { documents, documentSections } from '@/lib/db/schema';
import { eq, and, notInArray, sql } from 'drizzle-orm';
import { validateSectionContent } from '@/lib/documents/schemas';
import { SectionContent } from '@/lib/documents/types';
import { randomUUID } from 'crypto';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

interface SaveDocumentPayload {
  clientVersion: number;
  meta?: {
    title?: string;
    templateId?: string;
    accentColor?: string;
    targetRole?: string | null;
  };
  sections: Array<{
    id?: string;
    sectionType: string;
    title: string;
    orderIndex: number;
    isVisible: boolean;
    content: SectionContent;
  }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;
    const body: SaveDocumentPayload = await req.json();

    // 1. Fetch current document and verify ownership
    const [currentDoc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!currentDoc) {
      return NextResponse.json({ error: 'Document not found or unauthorized.' }, { status: 404 });
    }

    // 2. Concurrency check: Version mismatch -> 409 STALE_SAVE_CONFLICT
    const incomingVersion = body.clientVersion;
    if (incomingVersion !== undefined && incomingVersion !== currentDoc.version) {
      const serverSections = await db
        .select()
        .from(documentSections)
        .where(eq(documentSections.documentId, documentId))
        .orderBy(documentSections.orderIndex);

      return NextResponse.json(
        {
          error: 'STALE_SAVE_CONFLICT',
          message:
            'This document was modified in another session. Please choose whether to reload the server copy or keep your version.',
          serverVersion: currentDoc.version,
          serverDoc: {
            meta: currentDoc,
            sections: serverSections,
          },
        },
        { status: 409 }
      );
    }

    // 3. Normalize and sanitize section content payloads before validation
    for (const sec of body.sections) {
      if (sec.sectionType === 'certifications' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (Array.isArray(c.entries)) {
          c.entries = c.entries.map((entry: Record<string, unknown>) => ({
            ...entry,
            name: (entry.name || entry.title || 'Certification Name')?.toString().trim().slice(0, 500),
            issuingOrg: (entry.issuingOrg || entry.issuer || 'Certification Authority')?.toString().trim().slice(0, 300),
          }));
        }
      } else if (sec.sectionType === 'achievements' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (Array.isArray(c.entries)) {
          c.entries = c.entries.map((entry: Record<string, unknown>) => ({
            ...entry,
            title: (entry.title || entry.name || 'Achievement Title')?.toString().trim().slice(0, 500),
            issuer: entry.issuer ? entry.issuer.toString().trim().slice(0, 300) : undefined,
          }));
        }
      } else if (sec.sectionType === 'header' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (c.phone) c.phone = c.phone.toString().trim().slice(0, 100);
        if (c.city) c.city = c.city.toString().trim().slice(0, 255);
        if (c.country) c.country = c.country.toString().trim().slice(0, 255);
        if (c.location) c.location = c.location.toString().trim().slice(0, 255);
      }

      const valResult = validateSectionContent(sec.sectionType, sec.content);
      if (!valResult.valid) {
        return NextResponse.json(
          {
            error: `Validation error in section "${sec.title}": ${valResult.errors?.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const nextVersion = currentDoc.version + 1;
    const updatedMeta = body.meta || {};

    // 4. Atomic transaction: increment version and update/upsert sections
    await db.transaction(async (tx) => {
      // a. Update document metadata and increment version
      await tx
        .update(documents)
        .set({
          title: updatedMeta.title !== undefined ? updatedMeta.title.slice(0, 200) : currentDoc.title,
          templateId: updatedMeta.templateId || currentDoc.templateId,
          accentColor: updatedMeta.accentColor || currentDoc.accentColor,
          targetRole:
            updatedMeta.targetRole !== undefined
              ? updatedMeta.targetRole
                ? String(updatedMeta.targetRole).slice(0, 200)
                : null
              : currentDoc.targetRole,
          version: sql`${documents.version} + 1`,
          updatedAt: now,
        })
        .where(eq(documents.id, documentId));

      // b. Fetch existing section IDs to differentiate updates vs inserts
      const existingSections = await tx
        .select({ id: documentSections.id })
        .from(documentSections)
        .where(eq(documentSections.documentId, documentId));

      const existingIdSet = new Set(existingSections.map((s) => s.id));
      const incomingIds: string[] = [];

      for (const sec of body.sections) {
        const secId = sec.id && existingIdSet.has(sec.id) ? sec.id : sec.id || randomUUID();
        incomingIds.push(secId);

        if (existingIdSet.has(secId)) {
          // Stable-ID update in place
          await tx
            .update(documentSections)
            .set({
              title: sec.title.slice(0, 150),
              orderIndex: sec.orderIndex,
              isVisible: sec.isVisible,
              content: sec.content,
              updatedAt: now,
            })
            .where(and(eq(documentSections.id, secId), eq(documentSections.documentId, documentId)));
        } else {
          // Insert new section
          await tx.insert(documentSections).values({
            id: secId,
            documentId,
            sectionType: sec.sectionType,
            title: sec.title.slice(0, 150),
            orderIndex: sec.orderIndex,
            isVisible: sec.isVisible,
            content: sec.content,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // c. Delete ONLY sections that were removed from the payload
      if (incomingIds.length > 0) {
        await tx
          .delete(documentSections)
          .where(
            and(
              eq(documentSections.documentId, documentId),
              notInArray(documentSections.id, incomingIds)
            )
          );
      }
    });

    return NextResponse.json({
      success: true,
      newVersion: nextVersion,
      updatedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('Error saving document:', err);
    const message = err instanceof Error ? err.message : 'Failed to save document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
