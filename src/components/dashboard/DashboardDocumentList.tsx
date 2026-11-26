'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Search,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DocumentStatus, DocumentType, TemplateId } from '@/lib/documents/types';
import { WARM_TOKENS } from '@/styles/tokens';
import { useToast } from '@/components/ui/ToastProvider';
import { FloatCard } from '@/components/ui/FloatCard';

export interface DocumentItem {
  id: string;
  type: string;
  title: string;
  target_role?: string | null;
  target_company?: string | null;
  page_count?: number | null;
  template_id?: string | null;
  status?: string | null;
  updated_at: string;
}

export interface ProfileSectionCount {
  key: string;
  label: string;
  count: number;
  href: string;
}

export interface ProfileSummaryData {
  hasProfile: boolean;
  backgroundGroup: string | null;
  specialization: string | null;
  sections: ProfileSectionCount[];
}

interface DashboardDocumentListProps {
  initialDocuments: DocumentItem[];
  profileSummary: ProfileSummaryData;
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

const TEMPLATE_LABELS: Record<string, string> = {
  ats_single_column: 'ATS Single Column',
  modern_professional: 'Modern Professional',
  academic_cv: 'Academic CV',
};

function formatRelativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

export function DashboardDocumentList({
  initialDocuments,
  profileSummary,
}: DashboardDocumentListProps) {
  const router = useRouter();
  const toast = useToast();

  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ready'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  const [newType, setNewType] = useState<DocumentType>('resume');
  const [newTemplate, setNewTemplate] = useState<TemplateId>('ats_single_column');
  const [newTitle, setNewTitle] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalDocs = docs.length;
  const isCapReached = totalDocs >= 20;

  useEffect(() => {
    if (!openMenuId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...docs]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .filter((doc) => {
        const docStatus: DocumentStatus = doc.status === 'ready' ? 'ready' : 'draft';
        if (statusFilter !== 'all' && docStatus !== statusFilter) {
          return false;
        }
        if (!q) return true;
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const roleMatch = (doc.target_role || '').toLowerCase().includes(q);
        return titleMatch || roleMatch;
      });
  }, [docs, searchQuery, statusFilter]);

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
    if (duplicatingId || isSubmitting) return;
    setOpenMenuId(null);
    if (isCapReached) {
      toast.show({
        message: 'Document limit reached (20 of 20). Delete an older document first.',
        variant: 'error',
      });
      return;
    }

    setDuplicatingId(docId);
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
      const message = err instanceof Error ? err.message : 'Error duplicating document';
      toast.show({ message, variant: 'error' });
      setDuplicatingId(null);
    }
  };

  const handleToggleStatus = async (doc: DocumentItem) => {
    if (updatingStatusId) return;
    setOpenMenuId(null);
    const currentStatus: DocumentStatus = doc.status === 'ready' ? 'ready' : 'draft';
    const nextStatus: DocumentStatus = currentStatus === 'ready' ? 'draft' : 'ready';

    setUpdatingStatusId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      setDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: nextStatus,
                updated_at: data.document?.updatedAt || new Date().toISOString(),
              }
            : d
        )
      );
      toast.show({
        message: `Marked "${doc.title}" as ${nextStatus === 'ready' ? 'Ready' : 'Draft'}`,
        variant: 'success',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.show({ message, variant: 'error' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      const deletedTitle = docToDelete.title;
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
      toast.show({ message: `Deleted "${deletedTitle}"`, variant: 'info' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting document';
      toast.show({ message, variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Documents Surface */}
      <FloatCard
        as="section"
        floatIndex={1}
        aria-labelledby="documents-heading"
        className="rounded-xl overflow-visible shadow-sm"
        style={{ backgroundColor: WARM_TOKENS.surface }}
      >
        {/* Title Row */}
        <div
          className="px-4 sm:px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ borderColor: WARM_TOKENS.borderSubtle }}
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1
              id="documents-heading"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: WARM_TOKENS.ink }}
            >
              Documents
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isCapReached ? WARM_TOKENS.accentSoft : WARM_TOKENS.surface2,
                color: isCapReached ? WARM_TOKENS.accentStrong : WARM_TOKENS.ink,
              }}
            >
              {totalDocs} of 20
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreate('resume')}
            disabled={isCapReached}
            className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: WARM_TOKENS.primary,
              color: WARM_TOKENS.primaryText,
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New document</span>
          </button>
        </div>

        {/* Search & Status Filter Bar */}
        <div
          className="px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          style={{
            backgroundColor: WARM_TOKENS.surface1,
            borderColor: WARM_TOKENS.borderSubtle,
          }}
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: WARM_TOKENS.muted }}
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search documents"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or target role..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderDefault,
                color: WARM_TOKENS.ink,
              }}
            />
          </div>

          <div className="sm:w-44">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'ready')}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#800021]"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderDefault,
                color: WARM_TOKENS.ink,
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>

        {/* Document Rows */}
        {docs.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto" style={{ color: WARM_TOKENS.muted }} aria-hidden="true" />
            <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
              No documents yet
            </h2>
            <p className="text-xs sm:text-sm max-w-[54ch] mx-auto leading-relaxed" style={{ color: WARM_TOKENS.muted }}>
              Create a targeted resume or academic CV from your master profile facts. Each document keeps its own layout, order, and status.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOpenCreate('resume')}
                className="min-h-[44px] px-5 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
                style={{
                  backgroundColor: WARM_TOKENS.primary,
                  color: WARM_TOKENS.primaryText,
                }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New document</span>
              </button>
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm font-semibold" style={{ color: WARM_TOKENS.ink }}>
              No matching documents
            </p>
            <p className="text-xs" style={{ color: WARM_TOKENS.muted }}>
              Try adjusting your search query or status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="min-h-[44px] px-4 rounded-lg border text-xs font-semibold"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderDefault,
                color: WARM_TOKENS.ink,
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            role="list"
            aria-label="Documents list"
            className="divide-y"
            style={{ borderColor: WARM_TOKENS.borderSubtle }}
          >
            {filteredDocs.map((doc) => {
              const status: DocumentStatus = doc.status === 'ready' ? 'ready' : 'draft';
              const isReady = status === 'ready';
              const templateName =
                TEMPLATE_LABELS[doc.template_id || ''] ||
                doc.template_id?.replace(/_/g, ' ') ||
                'ATS Single Column';
              const exactDate = doc.updated_at ? new Date(doc.updated_at).toISOString() : '';
              const relativeDate = doc.updated_at ? formatRelativeTime(doc.updated_at) : '';
              const menuOpen = openMenuId === doc.id;

              return (
                <div
                  key={doc.id}
                  role="listitem"
                  data-doc-row={doc.id}
                  className="group relative px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 transition-colors motion-reduce:transition-none [@media(hover:hover)]:hover:bg-[#FCF9F4] focus-within:bg-[#FCF9F4]"
                >
                  {/* Primary clickable link area */}
                  <Link
                    href={`/editor/${doc.id}`}
                    className="flex-1 min-w-0 flex items-center gap-3.5 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#800021]"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: WARM_TOKENS.surface2,
                        color: WARM_TOKENS.accentStrong,
                      }}
                    >
                      {doc.type === 'cv' ? (
                        <GraduationCap className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <FileText className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-4 items-center">
                      <div className="lg:col-span-5 min-w-0">
                        <div className="text-sm font-semibold truncate group-hover:underline" style={{ color: WARM_TOKENS.ink }}>
                          {doc.title}
                        </div>
                        {doc.target_role && (
                          <div className="text-xs truncate" style={{ color: WARM_TOKENS.muted }}>
                            {doc.target_role}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-3 text-xs truncate" style={{ color: WARM_TOKENS.muted }}>
                        {templateName}
                      </div>

                      <div className="lg:col-span-2 flex items-center">
                        <span
                          data-status-pill={status}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                          style={
                            isReady
                              ? {
                                  backgroundColor: WARM_TOKENS.readyBg,
                                  color: WARM_TOKENS.readyText,
                                  borderColor: WARM_TOKENS.readyText,
                                }
                              : {
                                  backgroundColor: WARM_TOKENS.surface2,
                                  color: WARM_TOKENS.ink,
                                  borderColor: WARM_TOKENS.borderSubtle,
                                }
                          }
                        >
                          {isReady ? (
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <Clock className="w-3 h-3" aria-hidden="true" />
                          )}
                          {isReady ? 'Ready' : 'Draft'}
                        </span>
                      </div>

                      <div
                        className="lg:col-span-2 text-xs lg:text-right"
                        style={{ color: WARM_TOKENS.muted }}
                        title={exactDate}
                        suppressHydrationWarning
                      >
                        {relativeDate}
                      </div>
                    </div>
                  </Link>

                  {/* Row Actions Menu */}
                  <div
                    className="relative shrink-0"
                    ref={menuOpen ? menuContainerRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(menuOpen ? null : doc.id)}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      aria-label={`Actions for ${doc.title}`}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg border transition-colors motion-reduce:transition-none [@media(hover:hover)]:hover:bg-[#F8F4ED] focus:outline-none focus:ring-2 focus:ring-[#800021]"
                      style={{
                        borderColor: WARM_TOKENS.borderSubtle,
                        color: WARM_TOKENS.ink,
                        backgroundColor: WARM_TOKENS.surface,
                      }}
                    >
                      {duplicatingId === doc.id || updatingStatusId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>

                    {menuOpen && (
                      <div
                        role="menu"
                        aria-label={`Document actions for ${doc.title}`}
                        className="absolute right-0 mt-1 w-48 rounded-xl border shadow-lg py-1.5 z-50"
                        style={{
                          backgroundColor: WARM_TOKENS.surface,
                          borderColor: WARM_TOKENS.borderDefault,
                        }}
                      >
                        <Link
                          role="menuitem"
                          href={`/editor/${doc.id}`}
                          onClick={() => setOpenMenuId(null)}
                          className="min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-[#FCF9F4] focus:outline-none focus:bg-[#FCF9F4]"
                          style={{ color: WARM_TOKENS.ink }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Open</span>
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleToggleStatus(doc)}
                          className="w-full min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-[#FCF9F4] focus:outline-none focus:bg-[#FCF9F4] text-left"
                          style={{ color: WARM_TOKENS.ink }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isReady ? 'Mark as Draft' : 'Mark as Ready'}</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleDuplicate(doc.id)}
                          className="w-full min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-[#FCF9F4] focus:outline-none focus:bg-[#FCF9F4] text-left"
                          style={{ color: WARM_TOKENS.ink }}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDocToDelete(doc);
                          }}
                          className="w-full min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-[#F8F4ED] focus:outline-none focus:bg-[#F8F4ED] text-left"
                          style={{ color: WARM_TOKENS.accentStrong }}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FloatCard>

      {/* Master Profile Summary (Kept as bordered card per Phase 8B spec) */}
      <FloatCard
        as="section"
        floatIndex={2}
        aria-labelledby="master-profile-summary-heading"
        className="rounded-xl border p-5 sm:p-6 shadow-sm space-y-4"
        style={{
          backgroundColor: WARM_TOKENS.surface,
          borderColor: WARM_TOKENS.borderDefault,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="master-profile-summary-heading"
              className="font-display text-lg font-bold"
              style={{ color: WARM_TOKENS.ink }}
            >
              Your master profile
            </h2>
            <p className="text-xs mt-0.5 max-w-[70ch]" style={{ color: WARM_TOKENS.muted }}>
              {profileSummary.hasProfile
                ? `${profileSummary.backgroundGroup || 'Background configured'}${profileSummary.specialization ? ` · ${profileSummary.specialization}` : ''}`
                : 'Complete onboarding to set up your reusable master profile.'}
            </p>
          </div>
          <Link
            href={profileSummary.hasProfile ? '/profile' : '/onboarding'}
            className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded px-1"
            style={{ color: WARM_TOKENS.accentStrong }}
          >
            <span>{profileSummary.hasProfile ? 'Edit master profile' : 'Set up profile'}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {profileSummary.sections.map((sec) => (
            <div
              key={sec.key}
              className="rounded-lg p-3 flex items-center justify-between gap-2"
              style={{ backgroundColor: WARM_TOKENS.surface2 }}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: WARM_TOKENS.ink }}>
                  {sec.label}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: WARM_TOKENS.muted }}>
                  {sec.count}
                </div>
              </div>
              <Link
                href={profileSummary.hasProfile ? sec.href : '/onboarding'}
                className="min-h-[44px] px-2 inline-flex items-center text-xs font-semibold hover:underline shrink-0 focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
                style={{ color: WARM_TOKENS.accentStrong }}
              >
                {sec.count === 0 ? 'Add' : 'View'}
              </Link>
            </div>
          ))}
        </div>
      </FloatCard>

      {/* CREATE DOCUMENT MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24221F]/60"
        >
          <div
            className="border rounded-xl max-w-lg w-full p-6 shadow-xl relative"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderDefault,
            }}
          >
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md hover:bg-[#F8F4ED] focus:outline-none focus:ring-2 focus:ring-[#800021]"
              style={{ color: WARM_TOKENS.ink }}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 id="create-modal-title" className="font-display text-xl font-bold" style={{ color: WARM_TOKENS.ink }}>
              Create New Document
            </h3>
            <p className="text-xs mt-1 mb-5 max-w-[70ch]" style={{ color: WARM_TOKENS.muted }}>
              Facts from your master profile will be cloned into an independent document. Edits made here will not change your master profile.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-[#FFE4D8] border border-[#800021] rounded-lg text-xs text-[#800021] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: WARM_TOKENS.ink }}>
                  Document Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('resume');
                      setNewTemplate('ats_single_column');
                      if (newTitle === 'Academic Curriculum Vitae') setNewTitle('Professional Resume');
                    }}
                    className={`min-h-[44px] p-3 rounded-lg border text-left transition-colors ${
                      newType === 'resume'
                        ? 'border-[#800021] bg-[#FFE4D8]'
                        : 'border-[#6B6B6B] bg-[#FFFDF9]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#24221F]">Resume</div>
                    <div className="text-[11px] text-[#706A63]">ATS-ready, 1-page industry</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('cv');
                      setNewTemplate('academic_cv');
                      if (newTitle === 'Professional Resume') setNewTitle('Academic Curriculum Vitae');
                    }}
                    className={`min-h-[44px] p-3 rounded-lg border text-left transition-colors ${
                      newType === 'cv'
                        ? 'border-[#800021] bg-[#FFE4D8]'
                        : 'border-[#6B6B6B] bg-[#FFFDF9]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#24221F]">Academic CV</div>
                    <div className="text-[11px] text-[#706A63]">Scholarly, multi-page</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: WARM_TOKENS.ink }}>
                  Template Style
                </label>
                <div className="space-y-2">
                  {TEMPLATE_OPTIONS.filter((opt) => opt.type === newType || newType === 'resume').map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                        newTemplate === opt.id
                          ? 'border-[#800021] bg-[#FFE4D8]'
                          : 'border-[#6B6B6B] bg-[#FFFDF9]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={opt.id}
                        checked={newTemplate === opt.id}
                        onChange={() => setNewTemplate(opt.id)}
                        className="mt-0.5 text-[#800021] focus:ring-[#800021]"
                      />
                      <div>
                        <div className="font-semibold text-[#24221F]">{opt.name}</div>
                        <div className="text-[11px] text-[#706A63] leading-snug">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="doc-title" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: WARM_TOKENS.ink }}>
                  Document Title
                </label>
                <input
                  id="doc-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SWE Intern Resume - Fall 2026"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] text-[#24221F] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
                />
              </div>

              <div>
                <label htmlFor="target-role" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: WARM_TOKENS.ink }}>
                  Target Role (Optional)
                </label>
                <input
                  id="target-role"
                  type="text"
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  placeholder="e.g. Backend Engineering Intern"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] text-[#24221F] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] text-[#24221F] text-xs font-semibold hover:bg-[#F8F4ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create &amp; Open Editor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {docToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24221F]/60"
        >
          <div
            className="border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderDefault,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#FFE4D8] text-[#800021] shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="font-display text-base font-bold text-[#24221F]">
                  Delete &ldquo;{docToDelete.title}&rdquo;?
                </h3>
                <p className="text-xs text-[#706A63] mt-1 leading-relaxed">
                  This document will be permanently removed. Your master profile facts and other documents will remain untouched.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] text-[#24221F] text-xs font-semibold hover:bg-[#F8F4ED]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                aria-busy={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
