import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient, getVerifiedUser } from '@/lib/supabase/server';
import { DocumentEditor } from './DocumentEditor';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await getVerifiedUser();

  if (!user) {
    redirect(`/login?next=/editor/${documentId}`);
  }

  const supabase = await createClient();

  // Fetch document and sections in parallel
  const [
    { data: doc, error: docError },
    { data: sections, error: secError },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('document_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('order_index', { ascending: true }),
  ]);

  if (docError || !doc || secError || !sections) {
    notFound();
  }

  const initialDocument = {
    meta: {
      id: doc.id,
      userId: doc.user_id,
      title: doc.title,
      type: doc.type,
      templateId: doc.template_id || doc.templateId || 'ats_single_column',
      accentColor: doc.accent_color || doc.accentColor || '#0B0B0B',
      targetRole: doc.target_role ?? doc.targetRole ?? null,
      targetCompany: doc.target_company ?? doc.targetCompany ?? null,
      status: doc.status === 'ready' ? 'ready' : 'draft',
      layoutSettings: doc.layout_settings ?? doc.layoutSettings ?? {},
      version: doc.version,
      schemaVersion: doc.schema_version || '1.0.0',
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      isArchived: doc.is_archived || false,
    } as unknown as DocumentMeta,
    sections: sections.map((s) => ({
      id: s.id,
      documentId: s.document_id,
      sectionType: s.section_type || s.sectionType,
      title: s.title,
      orderIndex: s.order_index ?? s.orderIndex ?? 0,
      isVisible: s.is_visible ?? s.isVisible ?? true,
      content: s.content,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })) as unknown as DocumentSection[],
  };

  return <DocumentEditor initialDocument={initialDocument} />;
}
