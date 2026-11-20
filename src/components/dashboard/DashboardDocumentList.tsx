'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  GraduationCap,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DocumentType, TemplateId } from '@/lib/documents/types';

interface DocumentItem {
  id: string;
  type: string;
  title: string;
  target_role?: string | null;
  target_company?: string | null;
  page_count?: number | null;
  template_id?: string | null;
  updated_at: string;
}

interface DashboardDocumentListProps {
  initialDocuments: DocumentItem[];
}

const TEMPLATE_OPTIONS: { id: TemplateId; name: string; description: string; type: DocumentType }[] = [
  {
    id: 'ats_single_column',
    name: 'ATS Single Column',
    description: 'Classic linear layout designed for parsing precision across high-volume applicant tracking systems.',
    type: 'resume',
  },
  {
    id: 'modern_professional',
    name: 'Modern Professional',
    description: 'Clean structured design featuring clear visual hierarchy, subtle accent lines, and balanced typography.',
    type: 'resume',
  },
  {
    id: 'academic_cv',
    name: 'Academic CV',
    description: 'Scholarly multi-page dossier formatted for publications, research experience, teaching, and grants.',
    type: 'cv',
  },
];

export function DashboardDocumentList({ initialDocuments }: DashboardDocumentListProps) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  // Form states for creating document
  const [newType, setNewType] = useState<DocumentType>('resume');
  const [newTemplate, setNewTemplate] = useState<TemplateId>('ats_single_column');
  const [newTitle, setNewTitle] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalDocs = docs.length;
  const isCapReached = totalDocs >= 20;

  const handleOpenCreate = (type?: DocumentType) => {
    if (isCapReached) return;
    const selectedType = type || 'resume';
    setNewType(selectedType);
    setNewTemplate(selectedType === 'cv' ? 'academic_cv' : 'ats_single_column');
    setNewTitle(selectedType === 'cv' ? 'Academic Curriculum Vitae' : 'Professional Resume');
    setNewTargetRole('');
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          templateId: newTemplate,
          title: newTitle.trim() || (newType === 'cv' ? 'Academic CV' : 'Professional Resume'),
          targetRole: newTargetRole.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create document');
      }

      const docId = data.documentId || data.document?.id;
      if (!docId) {
        throw new Error('No document ID returned from server');
      }
      setIsCreateOpen(false);
      router.push(`/editor/${docId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating document';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (docId: string) => {
    if (isCapReached) {
      alert('You have reached the limit of 20 documents. Delete an existing document first.');
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to duplicate document');
      }
      const newDocId = data.documentId || data.document?.id;
      if (!newDocId) {
        throw new Error('No document ID returned from server');
      }
      router.push(`/editor/${newDocId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error duplicating';
      alert(message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting';
      alert(message);
    }
  };

  return (
    <>
      {/* Documents Section Header Panel */}
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B0B0B]">Your Documents</h2>
          <p className="text-xs text-[#333333] mt-0.5">
            Create, duplicate, and edit targeted resumes and scholarly CVs independently.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 20-doc Cap Badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
              isCapReached
                ? 'bg-[#FFE4D8] text-[#800021] border-[#800021]'
                : 'bg-[#F1F7F7] text-[#0B0B0B] border-[#6B6B6B]'
            }`}
          >
            {totalDocs} / 20 documents used
          </span>

          <button
            type="button"
            onClick={() => handleOpenCreate('resume')}
            disabled={isCapReached}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 ${
              isCapReached
                ? 'bg-[#D9D9D9] text-[#6B6B6B] cursor-not-allowed'
                : 'bg-[#800021] hover:bg-[#881144] text-[#FFFFFF]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Document
          </button>
        </div>
      </div>

      {/* Documents Table / List */}
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:px-6 border-b border-[#6B6B6B] flex items-center justify-between bg-[#F1F7F7]">
          <span className="font-display text-sm font-bold text-[#0B0B0B]">Document Title &amp; Target</span>
          <span className="text-xs text-[#333333] font-medium hidden sm:inline">Actions</span>
        </div>

        {docs.length === 0 ? (
          <div className="py-16 text-center px-6">
            <FileText className="w-10 h-10 mx-auto text-[#6B6B6B] mb-3" />
            <h4 className="font-display text-base font-semibold text-[#0B0B0B]">No documents yet</h4>
            <p className="text-xs text-[#333333] max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
              Start by creating an ATS-optimized resume or multi-page academic CV from your master profile facts.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreate('resume')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create your first document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#6B6B6B]">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F1F7F7]/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#F1F7F7] border border-[#6B6B6B] text-[#800021] mt-0.5">
                    {doc.type === 'resume' ? <FileText className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                  </div>
                  <div>
                    <Link
                      href={`/editor/${doc.id}`}
                      className="font-semibold text-sm text-[#0B0B0B] hover:text-[#800021] hover:underline"
                    >
                      {doc.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#333333] mt-0.5">
                      <span className="capitalize font-medium">{doc.type}</span>
                      <span>&bull;</span>
                      <span className="capitalize">
                        {doc.template_id?.replace(/_/g, ' ') || 'ATS Single Column'}
                      </span>
                      {doc.target_role && (
                        <>
                          <span>&bull;</span>
                          <span>Target: {doc.target_role}</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span suppressHydrationWarning>
                        Updated {doc.updated_at ? new Date(doc.updated_at).toISOString().slice(0, 10) : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/editor/${doc.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
                  >
                    Open Editor
                    <ExternalLink className="w-3 h-3 text-[#6B6B6B]" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(doc.id)}
                    className="p-1.5 rounded-md border border-[#6B6B6B] text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
                    title="Duplicate into independent copy"
                    aria-label="Duplicate document"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    className="p-1.5 rounded-md border border-[#6B6B6B] text-[#800021] hover:bg-[#FFE4D8] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
                    title="Delete document"
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE DOCUMENT MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0B]/60"
        >
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in-50 duration-200">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 id="create-modal-title" className="font-display text-xl font-bold text-[#0B0B0B]">
              Create New Document
            </h3>
            <p className="text-xs text-[#333333] mt-1 mb-5">
              Facts from your master profile will be cloned into an independent document. Edits made here will not change your master profile.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-[#FFE4D8] border border-[#800021] rounded-lg text-xs text-[#800021] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-[#0B0B0B] mb-1.5">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('resume');
                      setNewTemplate('ats_single_column');
                      if (!newTitle || newTitle === 'Academic Curriculum Vitae') {
                        setNewTitle('Professional Resume');
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                      newType === 'resume'
                        ? 'border-[#800021] bg-[#FFE4D8]/30 font-semibold'
                        : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7]'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${newType === 'resume' ? 'text-[#800021]' : 'text-[#6B6B6B]'}`} />
                    <div>
                      <div className="text-xs text-[#0B0B0B]">Resume</div>
                      <div className="text-[10px] text-[#333333]">Industry / 1 page</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewType('cv');
                      setNewTemplate('academic_cv');
                      if (!newTitle || newTitle === 'Professional Resume') {
                        setNewTitle('Academic Curriculum Vitae');
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                      newType === 'cv'
                        ? 'border-[#800021] bg-[#FFE4D8]/30 font-semibold'
                        : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7]'
                    }`}
                  >
                    <GraduationCap className={`w-4 h-4 ${newType === 'cv' ? 'text-[#800021]' : 'text-[#6B6B6B]'}`} />
                    <div>
                      <div className="text-xs text-[#0B0B0B]">Academic CV</div>
                      <div className="text-[10px] text-[#333333]">Scholarly / Multi-page</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label htmlFor="doc-title" className="block text-xs font-semibold text-[#0B0B0B] mb-1">
                  Document Title
                </label>
                <input
                  id="doc-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Google Systems Engineer Resume"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800021]"
                />
              </div>

              {/* Target Role Input */}
              <div>
                <label htmlFor="target-role" className="block text-xs font-semibold text-[#0B0B0B] mb-1">
                  Target Role / Program (Optional)
                </label>
                <input
                  id="target-role"
                  type="text"
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer or PhD Fellow"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800021]"
                />
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#0B0B0B] mb-1.5">Initial Template</label>
                <div className="space-y-2">
                  {TEMPLATE_OPTIONS.map((tmpl) => (
                    <label
                      key={tmpl.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newTemplate === tmpl.id
                          ? 'border-[#800021] bg-[#FFE4D8]/20'
                          : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template-choice"
                        value={tmpl.id}
                        checked={newTemplate === tmpl.id}
                        onChange={() => setNewTemplate(tmpl.id)}
                        className="mt-0.5 text-[#800021] focus:ring-[#800021]"
                      />
                      <div>
                        <div className="text-xs font-semibold text-[#0B0B0B]">{tmpl.name}</div>
                        <div className="text-[11px] text-[#333333] leading-relaxed mt-0.5">
                          {tmpl.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#6B6B6B] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Document...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create &amp; Open
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0B]/60"
        >
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in-50 duration-200">
            <h3 id="delete-modal-title" className="font-display text-lg font-bold text-[#0B0B0B]">
              Delete Document?
            </h3>
            <p className="text-xs text-[#333333] mt-2 mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#0B0B0B]">{docToDelete.title}</strong>? All tailored sections and custom edits in this document will be lost. Your master profile facts will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-lg border border-[#6B6B6B] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
              >
                Keep Document
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
