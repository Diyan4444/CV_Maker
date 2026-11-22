import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { documents, documentSections } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { validateSectionContent, validateDocumentSize } from '@/lib/documents/schemas';
import { DocumentType, TemplateId, SectionContent } from '@/lib/documents/types';
import { randomUUID } from 'crypto';

interface CreateCopyPayload {
  type?: DocumentType;
  templateId?: TemplateId;
  title?: string;
  accentColor?: string;
  targetRole?: string | null;
  sections: Array<{
    id?: string;
    sectionType: string;
    title: string;
    orderIndex?: number;
    isVisible?: boolean;
    content: SectionContent;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();

    // 1. Enforce 20-document user cap with user-friendly error
    const [docCountRow] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, user.id));

    const totalDocs = Number(docCountRow?.count || 0);
    if (totalDocs >= 20) {
      return NextResponse.json(
        {
          error:
            'You have reached the maximum limit of 20 documents. Please delete an older document to create a new one.',
          code: 'DOCUMENT_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    const body: CreateCopyPayload = await req.json();

    const type: DocumentType = body.type === 'cv' ? 'cv' : 'resume';
    const templateId: TemplateId =
      body.templateId && ['ats_single_column', 'modern_professional', 'academic_cv'].includes(body.templateId)
        ? body.templateId
        : (type === 'cv' ? 'academic_cv' : 'ats_single_column');

    const rawTitle = (body.title || '').trim();
    const title = (rawTitle || (type === 'cv' ? 'Curriculum Vitae (Recovered Copy)' : 'Resume (Recovered Copy)')).slice(0, 200);
    const targetRole = body.targetRole ? String(body.targetRole).slice(0, 200) : null;
    const accentColor = (body.accentColor && /^#[0-9A-Fa-f]{6}$/.test(body.accentColor))
      ? body.accentColor
      : '#0B0B0B';

    if (!Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'Sections array is required.' }, { status: 400 });
    }

    // 2. Validate all section contents with Zod schemas & size limits
    for (const sec of body.sections) {
      if (!sec.sectionType) {
        return NextResponse.json({ error: 'Each section must specify sectionType.' }, { status: 400 });
      }

      if (!validateDocumentSize(sec)) {
        return NextResponse.json(
          { error: `Section "${sec.title || sec.sectionType}" exceeds the 64KB size limit.` },
          { status: 400 }
        );
      }

      // Pre-process known entity fields if necessary
      if (sec.sectionType === 'experience' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (Array.isArray(c.entries)) {
          c.entries = c.entries.map((entry: Record<string, unknown>) => ({
            ...entry,
            type: entry.type || 'work',
          }));
        }
      } else if (sec.sectionType === 'certifications' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (Array.isArray(c.entries)) {
          c.entries = c.entries.map((entry: Record<string, unknown>) => ({
            ...entry,
            name: (entry.name ?? entry.title ?? '')?.toString().trim(),
            issuingOrg: (entry.issuingOrg ?? entry.issuer ?? '')?.toString().trim(),
          }));
        }
      } else if (sec.sectionType === 'achievements' && sec.content && typeof sec.content === 'object') {
        const c = sec.content as Record<string, unknown>;
        if (Array.isArray(c.entries)) {
          c.entries = c.entries.map((entry: Record<string, unknown>) => ({
            ...entry,
            title: (entry.title ?? entry.name ?? '')?.toString().trim(),
            issuer: entry.issuer !== undefined && entry.issuer !== null ? entry.issuer.toString().trim() : '',
          }));
        }
      }

      const valResult = validateSectionContent(sec.sectionType, sec.content);
      if (!valResult.valid) {
        return NextResponse.json(
          {
            error: `Validation error in section "${sec.title || sec.sectionType}": ${valResult.errors?.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Insert new document (isolated independent copy)
    const newDocId = randomUUID();
    const now = new Date();

    await db.insert(documents).values({
      id: newDocId,
      userId: user.id,
      type,
      templateId,
      title,
      accentColor,
      targetRole,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Insert sections for the new document
    for (let idx = 0; idx < body.sections.length; idx++) {
      const sec = body.sections[idx];
      await db.insert(documentSections).values({
        id: randomUUID(),
        documentId: newDocId,
        sectionType: sec.sectionType,
        title: (sec.title || sec.sectionType).slice(0, 200),
        orderIndex: typeof sec.orderIndex === 'number' ? sec.orderIndex : idx,
        isVisible: sec.isVisible !== false,
        content: sec.content,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      documentId: newDocId,
      title,
      version: 1,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[CREATE_COPY_ERROR] Failed to create copy of document');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create copy of document.' },
      { status: 500 }
    );
  }
}
