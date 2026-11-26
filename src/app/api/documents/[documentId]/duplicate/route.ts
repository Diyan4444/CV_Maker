import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { documents, documentSections } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;

    // 1. Enforce 20-document user cap
    const [docCountRow] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, user.id));

    const totalDocs = Number(docCountRow?.count || 0);
    if (totalDocs >= 20) {
      return NextResponse.json(
        {
          error:
            'You have reached the maximum limit of 20 documents. Please delete an older document to duplicate this one.',
          code: 'DOCUMENT_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    // 2. Fetch original document (ensuring ownership)
    const [origDoc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!origDoc) {
      return NextResponse.json({ error: 'Document not found or unauthorized.' }, { status: 404 });
    }

    // 3. Fetch original sections
    const origSections = await db
      .select()
      .from(documentSections)
      .where(eq(documentSections.documentId, documentId))
      .orderBy(documentSections.orderIndex);

    const newDocId = randomUUID();
    const newTitle = `Copy of ${origDoc.title}`.slice(0, 200);

    // 4. Duplicate document and all sections in an atomic transaction
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id: newDocId,
        userId: user.id,
        title: newTitle,
        type: origDoc.type,
        templateId: origDoc.templateId,
        accentColor: origDoc.accentColor,
        targetRole: origDoc.targetRole,
        status: 'draft',
        layoutSettings: origDoc.layoutSettings || {},
        version: 1,
        schemaVersion: origDoc.schemaVersion,
        isArchived: false,
      });

      if (origSections.length > 0) {
        await tx.insert(documentSections).values(
          origSections.map((sec) => ({
            id: randomUUID(),
            documentId: newDocId,
            sectionType: sec.sectionType,
            title: sec.title,
            orderIndex: sec.orderIndex,
            isVisible: sec.isVisible,
            content: sec.content,
          }))
        );
      }
    });

    return NextResponse.json({
      success: true,
      documentId: newDocId,
      document: { id: newDocId },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[DOCUMENT_DUPLICATE_ERROR] Failed to duplicate document');
    const message = err instanceof Error ? err.message : 'Failed to duplicate document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
