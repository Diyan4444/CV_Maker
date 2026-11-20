import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser, createClient } from '@/lib/supabase/server';
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

    // 1. Validate section content payloads first (pure schema validation)
    for (const sec of body.sections || []) {
      if (sec.sectionType === 'certifications' && sec.content && typeof sec.content === 'object') {
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
            error: `Validation error in section "${sec.title}": ${valResult.errors?.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // 2. Fetch current document and verify ownership via Supabase HTTPS client
    const { data: currentDoc, error: fetchErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr || !currentDoc) {
      return NextResponse.json({ error: 'Document not found or unauthorized.' }, { status: 404 });
    }

    // 3. Concurrency check: Version mismatch -> 409 STALE_SAVE_CONFLICT
    const incomingVersion = body.clientVersion;
    if (incomingVersion !== undefined && incomingVersion !== currentDoc.version) {
      const { data: serverSections } = await supabase
        .from('document_sections')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index', { ascending: true });

      return NextResponse.json(
        {
          error: 'STALE_SAVE_CONFLICT',
          message:
            'This document was modified in another session. Please choose whether to reload the server copy or keep your version.',
          serverVersion: currentDoc.version,
          serverDoc: {
            meta: currentDoc,
            sections: serverSections || [],
          },
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const nextVersion = currentDoc.version + 1;
    const updatedMeta = body.meta || {};

    // 4. Update document metadata and increment version
    const { error: updateDocErr } = await supabase
      .from('documents')
      .update({
        title: updatedMeta.title !== undefined ? updatedMeta.title.slice(0, 200) : currentDoc.title,
        template_id: updatedMeta.templateId || currentDoc.template_id,
        accent_color: updatedMeta.accentColor || currentDoc.accent_color,
        target_role:
          updatedMeta.targetRole !== undefined
            ? updatedMeta.targetRole
              ? String(updatedMeta.targetRole).slice(0, 200)
              : null
            : currentDoc.target_role,
        version: nextVersion,
        updated_at: now.toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (updateDocErr) {
      throw updateDocErr;
    }

    // 5. Update/upsert sections via Supabase HTTPS
    const incomingIds: string[] = [];
    for (const sec of body.sections || []) {
      const secId = sec.id || randomUUID();
      incomingIds.push(secId);

      const sectionRow = {
        id: secId,
        document_id: documentId,
        section_type: sec.sectionType,
        title: sec.title.slice(0, 150),
        order_index: sec.orderIndex,
        is_visible: sec.isVisible,
        content: sec.content,
        updated_at: now.toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('document_sections')
        .upsert(sectionRow, { onConflict: 'id' });

      if (upsertErr) {
        throw upsertErr;
      }
    }

    // 6. Delete removed sections
    if (incomingIds.length > 0) {
      const { data: existingSecs } = await supabase
        .from('document_sections')
        .select('id')
        .eq('document_id', documentId);

      const toDelete = (existingSecs || [])
        .map((s) => s.id)
        .filter((id) => !incomingIds.includes(id));

      if (toDelete.length > 0) {
        await supabase
          .from('document_sections')
          .delete()
          .in('id', toDelete)
          .eq('document_id', documentId);
      }
    }

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
