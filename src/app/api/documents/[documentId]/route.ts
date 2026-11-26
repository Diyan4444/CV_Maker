import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { documents, documentSections } from '@/lib/db/schema';
import { DocumentStatusSchema } from '@/lib/documents/schemas';
import { eq, and } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const sections = await db
      .select()
      .from(documentSections)
      .where(eq(documentSections.documentId, documentId))
      .orderBy(documentSections.orderIndex);

    return NextResponse.json({
      meta: doc,
      sections,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;

    // Delete document (database foreign key cascades to document_sections)
    const [deleted] = await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .returning({ id: documents.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Document not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: deleted.id });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[DOCUMENT_DELETE_ERROR] Failed to delete document');
    const message = err instanceof Error ? err.message : 'Failed to delete document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;
    const body = await req.json();

    const parsedStatus = DocumentStatusSchema.safeParse(body?.status);
    if (!parsedStatus.success) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "ready".' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(documents)
      .set({
        status: parsedStatus.data,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .returning({ id: documents.id, status: documents.status, updatedAt: documents.updatedAt });

    if (!updated) {
      return NextResponse.json({ error: 'Document not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Failed to update document status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
