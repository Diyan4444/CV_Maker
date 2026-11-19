import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { documents, documentSections } from '@/lib/db/schema';
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
    console.error('Error deleting document:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
