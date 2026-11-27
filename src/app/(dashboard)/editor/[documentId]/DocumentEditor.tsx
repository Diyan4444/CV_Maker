'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  DocumentMeta,
  DocumentSection,
  DocumentStatus,
  TemplateId,
  LayoutSettings,
  PdfFontFamily,
  BaseEntry,
  HeaderContent,
  SummaryContent,
  EntriesContent,
  SectionContent,
} from '@/lib/documents/types';
import { scanDocumentForNonLatin } from '@/lib/validation/pdf-text';
import { sanitizePdfFilename } from '@/lib/pdf/filename';

const LivePdfPreview = dynamic(
  () => import('@/components/editor/LivePdfPreview').then((m) => m.LivePdfPreview),
  { ssr: false }
);
import { resolvePdfLayout, getTemplateLayoutDefaults } from '@/lib/pdf/layout-settings';
import { runAtsReadinessChecks } from '@/lib/ats/checker';
import { AtsReadinessPanel } from '@/components/editor/AtsReadinessPanel';
import { AtsReadinessReport } from '@/lib/ats/types';
import { isDocumentContentEqual } from '@/lib/utils/deep-equal';
import { FIELD_LIMITS } from '@/lib/validation/field-limits';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSectionCard } from '@/components/editor/SortableSectionCard';
import { SectionEmptyState } from '@/components/editor/SectionEmptyState';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Download,
  Loader2,
  FileCheck,
  WifiOff,
  FileText,
  LayoutTemplate,
  Palette,
  SlidersHorizontal,
  PanelRightOpen,
  PanelRightClose,
  Check,
  RotateCcw,
} from 'lucide-react';

interface DocumentEditorProps {
  initialDocument: {
    meta: DocumentMeta;
    sections: DocumentSection[];
  };
}

const ALLOWED_ACCENTS = [
  { hex: '#0B0B0B', label: 'Ink Black' },
  { hex: '#800021', label: 'Wine Maroon' },
  { hex: '#881144', label: 'Deep Wine' },
  { hex: '#243A66', label: 'Navy' },
  { hex: '#163832', label: 'Forest' },
  { hex: '#235347', label: 'Deep Teal' },
  { hex: '#5D6B6B', label: 'Slate Mist' },
];

function normalizeMeta(m: any): DocumentMeta {
  if (!m) return {} as DocumentMeta;
  return {
    ...m,
    id: m.id,
    userId: m.userId || m.user_id,
    title: m.title || '',
    type: m.type || 'resume',
    templateId: m.templateId || m.template_id || 'ats_single_column',
    status: m.status === 'ready' ? 'ready' : 'draft',
    accentColor: m.accentColor || m.accent_color || '#0B0B0B',
    targetRole: m.targetRole ?? m.target_role ?? null,
    targetCompany: m.targetCompany ?? m.target_company ?? null,
    layoutSettings: m.layoutSettings ?? m.layout_settings ?? undefined,
    version: Number(m.version) || 1,
    schemaVersion: m.schemaVersion || m.schema_version || '1.0.0',
    createdAt: m.createdAt || m.created_at,
    updatedAt: m.updatedAt || m.updated_at,
  };
}

function normalizeSections(secs: any[]): DocumentSection[] {
  return (secs || []).map((s, idx) => ({
    id: s.id,
    documentId: s.documentId || s.document_id,
    sectionType: s.sectionType || s.section_type,
    title: s.title || '',
    orderIndex: typeof s.orderIndex === 'number' ? s.orderIndex : (typeof s.order_index === 'number' ? s.order_index : idx),
    isVisible: s.isVisible !== undefined ? Boolean(s.isVisible) : (s.is_visible !== undefined ? Boolean(s.is_visible) : true),
    content: s.content,
    createdAt: s.createdAt || s.created_at,
    updatedAt: s.updatedAt || s.updated_at,
  }));
}

export function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const router = useRouter();

  // Document state
  const [meta, setMeta] = useState<DocumentMeta>(normalizeMeta(initialDocument.meta));
  const [sections, setSections] = useState<DocumentSection[]>(normalizeSections(initialDocument.sections));
  const [editorRevision, setEditorRevision] = useState<number>(0);

  // Mutable refs to track latest editor state across async network boundaries
  const metaRef = useRef<DocumentMeta>(meta);
  const sectionsRef = useRef<DocumentSection[]>(sections);
  const isSavingRef = useRef<boolean>(false);
  const queuedSaveRef = useRef<boolean>(false);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    metaRef.current = meta;
    sectionsRef.current = sections;
  }, [meta, sections]);

  // Exact snapshot of last successfully saved document content
  const lastSavedSnapshotRef = useRef<{
    meta: DocumentMeta;
    sections: DocumentSection[];
  }>({
    meta: meta,
    sections: sections,
  });

  // Debounced autosave coalescing timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Undo / Redo history stack (up to 50 snapshots)
  const historyRef = useRef<Array<{ meta: DocumentMeta; sections: DocumentSection[] }>>([
    { meta: meta, sections: sections },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Save & concurrency state
  const [saveStatus, setSaveStatus] = useState<
    'saved' | 'saving' | 'unsaved' | 'conflict' | 'error' | 'offline'
  >('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<{
    serverVersion: number;
    serverDoc: { meta: DocumentMeta; sections: DocumentSection[] };
  } | null>(null);
  const [isCreatingCopy, setIsCreatingCopy] = useState<boolean>(false);
  const [isReloadingServer, setIsReloadingServer] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copySuccessToast, setCopySuccessToast] = useState<string | null>(null);

  // Field validation errors & session expiration state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sessionExpired, setSessionExpired] = useState(false);

  // Refs for conflict modal keyboard trapping
  const conflictReloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const conflictKeepCopyBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (conflictData) {
      setTimeout(() => {
        conflictReloadBtnRef.current?.focus();
      }, 50);
    }
  }, [conflictData]);

  const handleConflictModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = [conflictReloadBtnRef.current, conflictKeepCopyBtnRef.current].filter(Boolean) as HTMLElement[];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  // Reload server copy handler
  const handleConflictReload = useCallback(() => {
    if (!conflictData || isReloadingServer || isCreatingCopy) return;
    setIsReloadingServer(true);
    const serverMeta = normalizeMeta(conflictData.serverDoc.meta);
    const serverSections = normalizeSections(conflictData.serverDoc.sections);

    metaRef.current = serverMeta;
    sectionsRef.current = serverSections;
    lastSavedSnapshotRef.current = {
      meta: serverMeta,
      sections: JSON.parse(JSON.stringify(serverSections)),
    };

    historyRef.current = [{ meta: serverMeta, sections: serverSections }];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);

    try {
      localStorage.removeItem(`cv_maker_draft_${serverMeta.id}`);
    } catch {}

    setMeta(serverMeta);
    setSections(serverSections);
    setEditorRevision((prev) => prev + 1);
    setConflictData(null);
    setSaveStatus('saved');
    setSaveError(null);
    setFieldErrors({});
    setIsReloadingServer(false);
  }, [conflictData, isReloadingServer, isCreatingCopy]);

  // Keep my version as new copy handler
  const handleConflictKeepCopy = useCallback(async () => {
    if (isCreatingCopy || isReloadingServer) return;
    setIsCreatingCopy(true);
    setCopyError(null);

    try {
      const currentMeta = metaRef.current;
      const currentSections = sectionsRef.current;

      const res = await fetch('/api/documents/create-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: currentMeta.type,
          templateId: currentMeta.templateId,
          title: `${currentMeta.title} (Recovered Copy)`,
          accentColor: currentMeta.accentColor,
          targetRole: currentMeta.targetRole,
          layoutSettings: currentMeta.layoutSettings,
          sections: currentSections.map((s, idx) => ({
            id: s.id,
            sectionType: s.sectionType,
            title: s.title,
            orderIndex: idx,
            isVisible: s.isVisible,
            content: s.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCopyError(data.error || 'Failed to create copy.');
        setIsCreatingCopy(false);
        return;
      }

      if (data.documentId) {
        try {
          localStorage.removeItem(`cv_maker_draft_${currentMeta.id}`);
        } catch {}

        setCopySuccessToast('Copy created successfully! Redirecting...');
        setConflictData(null);
        setIsCreatingCopy(false);
        router.push(`/editor/${data.documentId}`);
      } else {
        setCopyError('Server did not return a valid document ID.');
        setIsCreatingCopy(false);
      }
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Network error creating copy.');
      setIsCreatingCopy(false);
    }
  }, [router, isCreatingCopy, isReloadingServer]);
  // Download PDF state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ATS readiness report state
  const [atsReport, setAtsReport] = useState<AtsReadinessReport | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  // Desktop right pane tab: 'preview' | 'ats'
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'ats'>('preview');

  // Mobile active tab (<768px): 'edit' | 'preview' | 'ats'
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview' | 'ats'>('edit');

  // Left icon rail tab: 'content' | 'template' | 'theme' | 'page'
  const [activeRailTab, setActiveRailTab] = useState<'content' | 'template' | 'theme' | 'page'>('content');

  // Section collapse, focus highlight, DnD announcement & master-profile import state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const [importingSectionId, setImportingSectionId] = useState<string | null>(null);
  const [noMasterDataSections, setNoMasterDataSections] = useState<Record<string, boolean>>({});
  const [expandedEmptyForms, setExpandedEmptyForms] = useState<Record<string, boolean>>({});
  const [importToast, setImportToast] = useState<{ message: string } | null>(null);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Tablet (768-1023px) collapsible preview toggle
  const [isTabletPreviewOpen, setIsTabletPreviewOpen] = useState(false);

  // Lazy-mount PDF preview only when visible (desktop >= 1024px, tablet toggle, or mobile preview/ATS tab)
  const [hasMountedPreview, setHasMountedPreview] = useState(false);
  useEffect(() => {
    if (
      hasMountedPreview ||
      typeof window === 'undefined'
    ) {
      return;
    }
    if (
      window.innerWidth >= 1024 ||
      isTabletPreviewOpen ||
      mobileTab === 'preview' ||
      mobileTab === 'ats'
    ) {
      queueMicrotask(() => setHasMountedPreview(true));
    }
  }, [hasMountedPreview, isTabletPreviewOpen, mobileTab]);

  // Measure toolbar height for sticky preview column
  const headerRef = useRef<HTMLElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(57);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateHeight = () => {
      setToolbarHeight(Math.round(el.getBoundingClientRect().height));
    };
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Preserve scroll positions when switching Preview <-> ATS or mobile tabs
  const atsScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollPositionsRef = useRef<{ preview: number; ats: number; windowEdit: number }>({
    preview: 0,
    ats: 0,
    windowEdit: 0,
  });

  const switchRightTab = useCallback((nextTab: 'preview' | 'ats') => {
    if (typeof document !== 'undefined') {
      const previewEl = document.getElementById('pdf-preview-scroll-container');
      if (previewEl && activeRightTab === 'preview') {
        savedScrollPositionsRef.current.preview = previewEl.scrollTop;
      }
      if (atsScrollRef.current && activeRightTab === 'ats') {
        savedScrollPositionsRef.current.ats = atsScrollRef.current.scrollTop;
      }
    }
    setActiveRightTab(nextTab);
    requestAnimationFrame(() => {
      if (nextTab === 'preview') {
        const previewEl = document.getElementById('pdf-preview-scroll-container');
        if (previewEl) previewEl.scrollTop = savedScrollPositionsRef.current.preview;
      } else if (atsScrollRef.current) {
        atsScrollRef.current.scrollTop = savedScrollPositionsRef.current.ats;
      }
    });
  }, [activeRightTab]);

  const switchMobileTab = useCallback((nextTab: 'edit' | 'preview' | 'ats') => {
    if (typeof window !== 'undefined') {
      if (mobileTab === 'edit') {
        savedScrollPositionsRef.current.windowEdit = window.scrollY;
      } else if (mobileTab === 'preview') {
        const previewEl = document.getElementById('pdf-preview-scroll-container');
        if (previewEl) savedScrollPositionsRef.current.preview = previewEl.scrollTop;
      } else if (mobileTab === 'ats' && atsScrollRef.current) {
        savedScrollPositionsRef.current.ats = atsScrollRef.current.scrollTop;
      }
    }
    setMobileTab(nextTab);
    if (nextTab === 'preview') setActiveRightTab('preview');
    if (nextTab === 'ats') setActiveRightTab('ats');
    requestAnimationFrame(() => {
      if (nextTab === 'edit' && typeof window !== 'undefined') {
        window.scrollTo(0, savedScrollPositionsRef.current.windowEdit);
      } else if (nextTab === 'preview') {
        const previewEl = document.getElementById('pdf-preview-scroll-container');
        if (previewEl) previewEl.scrollTop = savedScrollPositionsRef.current.preview;
      } else if (nextTab === 'ats' && atsScrollRef.current) {
        atsScrollRef.current.scrollTop = savedScrollPositionsRef.current.ats;
      }
    });
  }, [mobileTab]);

  // Draft recovery modal
  const [draftPrompt, setDraftPrompt] = useState<{
    draft: { meta: DocumentMeta; sections: DocumentSection[] };
  } | null>(null);

  // Expose status setter for automated E2E layout tests in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setTestSaveStatus = (status: any) => setSaveStatus(status);
    }
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      const isSaved = isDocumentContentEqual(
        meta,
        sections,
        lastSavedSnapshotRef.current.meta,
        lastSavedSnapshotRef.current.sections
      );
      setSaveStatus(isSaved ? 'saved' : 'unsaved');
    };
    const handleOffline = () => {
      setSaveStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [meta, sections]);

  // Save document to server
  const handleSave = useCallback(
    async (overrideMeta?: DocumentMeta, overrideSections?: DocumentSection[]) => {
      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      const sentMeta = overrideMeta || metaRef.current;
      const sentSections = overrideSections || sectionsRef.current;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      isSavingRef.current = true;
      setSaveStatus('saving');
      setSaveError(null);

      try {
        const res = await fetch(`/api/documents/${sentMeta.id}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientVersion: sentMeta.version,
            meta: {
              title: sentMeta.title,
              templateId: sentMeta.templateId,
              accentColor: sentMeta.accentColor,
              targetRole: sentMeta.targetRole,
              status: sentMeta.status || 'draft',
              layoutSettings: sentMeta.layoutSettings,
            },
            sections: sentSections.map((s, idx) => {
              let contentPayload: SectionContent = s.content;
              if (s.sectionType === 'experience' && contentPayload && typeof contentPayload === 'object') {
                const c = contentPayload as unknown as Record<string, unknown>;
                if (Array.isArray(c.entries)) {
                  contentPayload = {
                    ...c,
                    entries: c.entries.map((entry: Record<string, unknown>) => ({
                      ...entry,
                      type: entry.type || 'work',
                    })),
                  } as unknown as SectionContent;
                }
              } else if (s.sectionType === 'certifications' && contentPayload && typeof contentPayload === 'object') {
                const c = contentPayload as unknown as Record<string, unknown>;
                if (Array.isArray(c.entries)) {
                  contentPayload = {
                    ...c,
                    entries: c.entries.map((entry: Record<string, unknown>) => ({
                      ...entry,
                      id: (entry.id as string) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cert-${Date.now()}`),
                      name: (entry.name ?? entry.title ?? '')?.toString().trim(),
                      issuingOrg: (entry.issuingOrg ?? entry.issuer ?? '')?.toString().trim(),
                    })),
                  } as unknown as SectionContent;
                }
              } else if (s.sectionType === 'achievements' && contentPayload && typeof contentPayload === 'object') {
                const c = contentPayload as unknown as Record<string, unknown>;
                if (Array.isArray(c.entries)) {
                  contentPayload = {
                    ...c,
                    entries: c.entries.map((entry: Record<string, unknown>) => ({
                      ...entry,
                      id: (entry.id as string) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ach-${Date.now()}`),
                      title: (entry.title ?? entry.name ?? '')?.toString().trim(),
                      issuer: entry.issuer !== undefined && entry.issuer !== null ? entry.issuer.toString().trim() : '',
                    })),
                  } as unknown as SectionContent;
                }
              }
              return {
                id: s.id,
                sectionType: s.sectionType,
                title: s.title,
                orderIndex: idx,
                isVisible: s.isVisible,
                content: contentPayload,
              };
            }),
          }),
        });

        const resData = await res.json();

        if (res.status === 401) {
          try {
            localStorage.setItem(
              `cv_maker_draft_${sentMeta.id}`,
              JSON.stringify({ meta: metaRef.current, sections: sectionsRef.current, timestamp: Date.now() })
            );
          } catch {}
          setSessionExpired(true);
          setSaveStatus('error');
          setSaveError('Session expired');
          return;
        }

        if (res.status === 409) {
          setSaveStatus('conflict');
          setConflictData({
            serverVersion: resData.serverVersion,
            serverDoc: {
              meta: normalizeMeta(resData.serverDoc?.meta),
              sections: normalizeSections(resData.serverDoc?.sections),
            },
          });
          return;
        }

        if (!res.ok) {
          const rawErr = (resData.error as string) || 'Failed to save document.';
          let shortReason = 'Validation error';

          // Strip "Validation error in section XYZ: " prefix so regex parses the actual field error
          const colonIdx = rawErr.indexOf(': ');
          const errorBody = colonIdx !== -1 && rawErr.toLowerCase().startsWith('validation error')
            ? rawErr.slice(colonIdx + 2)
            : rawErr;

          const parsedErrors: Record<string, string> = {};
          const regex = /(?:entries\.\d+\.)?([a-zA-Z0-9_]+):\s*([^,]+)/g;
          let m;
          while ((m = regex.exec(errorBody)) !== null) {
            if (m[1] && m[2]) parsedErrors[m[1]] = m[2].trim();
          }

          const errorFields = Object.keys(parsedErrors).filter((k) => k !== 'schema_version' && k !== 'id' && k !== 'sourceId');
          if (errorFields.length > 0) {
            const f = errorFields[0];
            const fieldLabelMap: Record<string, string> = {
              startDate: 'Start Date',
              endDate: 'End Date',
              fullName: 'Full Name',
              name: 'Name',
              headline: 'Headline',
              summary: 'Summary',
              text: 'Summary',
              email: 'Email',
              phone: 'Phone',
              city: 'City',
              country: 'Country',
              location: 'Location',
              institution: 'Institution',
              degree: 'Degree',
              role: 'Role',
              organization: 'Company',
              company: 'Company',
              issuingOrg: 'Issuing Organization',
              issuer: 'Issuer',
              title: 'Title',
              description: 'Description',
            };
            const label = fieldLabelMap[f] || f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
            const errDetail = parsedErrors[f];
            if (errDetail.includes('Too big')) {
              const maxMatch = errDetail.match(/<=(\d+)/);
              shortReason = `${label} too long${maxMatch ? ` (max ${maxMatch[1]})` : ''}`;
            } else if (errDetail.includes('required')) {
              shortReason = `${label} is required`;
            } else {
              shortReason = `${label} invalid`;
            }
          } else if (rawErr.includes('exceeds the 64KB')) {
            shortReason = 'Section exceeds 64KB';
          }

          setFieldErrors(parsedErrors);
          setSaveError(shortReason);
          setSaveStatus('error');
          return;
        }

        // Save succeeded -> clear field errors
        setFieldErrors({});
        setSaveError(null);

        const newVersion = resData.newVersion;
        const updatedAt = resData.updatedAt;

        // CRITICAL FOR AUTOSAVE RACE:
        // Update lastSavedSnapshot to EXACTLY the content that was sent in this request
        lastSavedSnapshotRef.current = {
          meta: { ...sentMeta, version: newVersion, updatedAt },
          sections: JSON.parse(JSON.stringify(sentSections)),
        };

        // Advance document version without stomping user edits made in-flight
        setMeta((prev) => ({
          ...prev,
          version: newVersion,
          updatedAt,
        }));
        metaRef.current = {
          ...metaRef.current,
          version: newVersion,
          updatedAt,
        };

        // Check whether current editor content equals the saved snapshot
        const isCurrentEqual = isDocumentContentEqual(
          metaRef.current,
          sectionsRef.current,
          lastSavedSnapshotRef.current.meta,
          lastSavedSnapshotRef.current.sections
        );

        if (isCurrentEqual) {
          setSaveStatus('saved');
        } else {
          // Additional edits were made while the save request was in flight!
          setSaveStatus('unsaved');
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            handleSaveRef.current?.();
          }, 1500);
        }

        // Clear local draft once saved
        try {
          localStorage.removeItem(`cv_maker_draft_${sentMeta.id}`);
        } catch {}
      } catch (err: unknown) {
        console.error('[DOCUMENT_SAVE_ERROR] Save request failed');
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline) {
          setSaveStatus('offline');
          setSaveError('Offline');
        } else {
          setSaveStatus('error');
          setSaveError(err instanceof Error ? err.message.slice(0, 30) : 'Save failed');
        }
      } finally {
        isSavingRef.current = false;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          handleSaveRef.current?.();
        }
      }
    },
    [setFieldErrors]
  );

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Push snapshot to undo stack
  const pushHistory = useCallback(
    (newMeta: DocumentMeta, newSections: DocumentSection[]) => {
      // Keep refs immediately up to date with user edits
      metaRef.current = newMeta;
      sectionsRef.current = newSections;

      const idx = historyIndexRef.current;
      const nextHistory = historyRef.current.slice(0, idx + 1);
      nextHistory.push({ meta: newMeta, sections: newSections });
      if (nextHistory.length > 50) nextHistory.shift();

      historyRef.current = nextHistory;
      historyIndexRef.current = nextHistory.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);

      // Cancel any running debounced autosave
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // Check whether new state equals last saved state
      const isSaved = isDocumentContentEqual(
        newMeta,
        newSections,
        lastSavedSnapshotRef.current.meta,
        lastSavedSnapshotRef.current.sections
      );

      if (isSaved) {
        setSaveStatus('saved');
        try {
          localStorage.removeItem(`cv_maker_draft_${newMeta.id}`);
        } catch {}
      } else {
        setSaveStatus((prev) => (prev === 'error' ? 'error' : 'unsaved'));
        saveTimerRef.current = setTimeout(() => {
          handleSaveRef.current?.();
        }, 1500);

        // Sync to local draft
        try {
          localStorage.setItem(
            `cv_maker_draft_${newMeta.id}`,
            JSON.stringify({ meta: newMeta, sections: newSections, timestamp: Date.now() })
          );
        } catch {}
      }
    },
    []
  );

  // Check for local draft on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cv_maker_draft_${initialDocument.meta.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.meta &&
          parsed.sections &&
          (parsed.meta.title !== initialDocument.meta.title ||
            JSON.stringify(parsed.sections) !== JSON.stringify(initialDocument.sections))
        ) {
          setTimeout(() => {
            setDraftPrompt({ draft: parsed });
          }, 0);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [initialDocument]);

  const handleRestoreDraft = () => {
    if (draftPrompt) {
      const restoredMeta = {
        ...draftPrompt.draft.meta,
        version: metaRef.current.version,
        updatedAt: metaRef.current.updatedAt,
      };
      setMeta(restoredMeta);
      setSections(draftPrompt.draft.sections);
      pushHistory(restoredMeta, draftPrompt.draft.sections);
      setDraftPrompt(null);
    }
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(`cv_maker_draft_${meta.id}`);
    } catch {}
    setDraftPrompt(null);
  };

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const snap = historyRef.current[historyIndexRef.current];
      // Concurrency metadata (version, updatedAt) must track latest server version, not regress
      const restoredMeta: DocumentMeta = {
        ...snap.meta,
        version: metaRef.current.version,
        updatedAt: metaRef.current.updatedAt,
      };
      metaRef.current = restoredMeta;
      sectionsRef.current = snap.sections;
      setMeta(restoredMeta);
      setSections(snap.sections);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

      // Cancel any running debounced autosave
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // Check whether restored snapshot equals last saved content
      const isSaved = isDocumentContentEqual(
        restoredMeta,
        snap.sections,
        lastSavedSnapshotRef.current.meta,
        lastSavedSnapshotRef.current.sections
      );

      if (isSaved) {
        setSaveStatus('saved');
        try {
          localStorage.removeItem(`cv_maker_draft_${snap.meta.id}`);
        } catch {}
      } else {
        setSaveStatus((prev) => (prev === 'error' ? 'error' : 'unsaved'));
        saveTimerRef.current = setTimeout(() => {
          handleSaveRef.current?.();
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: restoredMeta, sections: snap.sections, timestamp: Date.now() })
          );
        } catch {}
      }
    }
  }, []);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const snap = historyRef.current[historyIndexRef.current];
      // Concurrency metadata (version, updatedAt) must track latest server version, not regress
      const restoredMeta: DocumentMeta = {
        ...snap.meta,
        version: metaRef.current.version,
        updatedAt: metaRef.current.updatedAt,
      };
      metaRef.current = restoredMeta;
      sectionsRef.current = snap.sections;
      setMeta(restoredMeta);
      setSections(snap.sections);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

      // Cancel any running debounced autosave
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // Check whether restored snapshot equals last saved content
      const isSaved = isDocumentContentEqual(
        restoredMeta,
        snap.sections,
        lastSavedSnapshotRef.current.meta,
        lastSavedSnapshotRef.current.sections
      );

      if (isSaved) {
        setSaveStatus('saved');
        try {
          localStorage.removeItem(`cv_maker_draft_${snap.meta.id}`);
        } catch {}
      } else {
        setSaveStatus((prev) => (prev === 'error' ? 'error' : 'unsaved'));
        saveTimerRef.current = setTimeout(() => {
          handleSaveRef.current?.();
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: restoredMeta, sections: snap.sections, timestamp: Date.now() })
          );
        } catch {}
      }
    }
  }, []);

  // Autosave timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // Section manipulation functions
  const updateSection = (sectionId: string, updater: (sec: DocumentSection) => DocumentSection) => {
    const next = sections.map((s) => (s.id === sectionId ? updater(s) : s));
    setSections(next);
    pushHistory(meta, next);
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const next = [...sections];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);

    const reordered = next.map((s, i) => ({ ...s, orderIndex: i }));
    setSections(reordered);
    pushHistory(meta, reordered);
    setReorderAnnouncement(
      `Moved ${moved.title || moved.sectionType} to position ${targetIdx + 1} of ${reordered.length}`
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const moved = sections[oldIndex];
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
      ...s,
      orderIndex: i,
    }));
    setSections(reordered);
    pushHistory(meta, reordered);
    setReorderAnnouncement(
      `Moved ${moved.title || moved.sectionType} to position ${newIndex + 1} of ${reordered.length}`
    );
  };

  const addEmptyEntryToSection = (sec: DocumentSection) => {
    const newEntryId = crypto.randomUUID();
    const currentEntries = [...((sec.content as EntriesContent<BaseEntry>).entries || [])];
    currentEntries.push({
      id: newEntryId,
      institution: '',
      degree: '',
      role: '',
      organization: '',
      title: '',
      category: '',
      items: [],
      authors: [],
      name: '',
      issuingOrg: '',
      issuer: '',
      description: '',
      bullets: [],
    });
    updateSection(sec.id, (s) => ({
      ...s,
      content: {
        ...(s.content as EntriesContent<BaseEntry>),
        entries: currentEntries,
      },
    }));
  };

  const handleImportFromMasterProfile = async (sec: DocumentSection) => {
    if (importingSectionId) return;
    setImportingSectionId(sec.id);
    try {
      const res = await fetch(
        `/api/documents/${meta.id}/import-source?section=${encodeURIComponent(sec.sectionType || 'custom')}`
      );
      if (!res.ok) {
        setImportingSectionId(null);
        return;
      }
      const data = await res.json();
      if (!data.hasData) {
        setNoMasterDataSections((prev) => ({ ...prev, [sec.id]: true }));
        setImportingSectionId(null);
        return;
      }

      if (sec.sectionType === 'header' && data.content) {
        setExpandedEmptyForms((prev) => ({ ...prev, [sec.id]: true }));
        updateSection(sec.id, (s) => ({
          ...s,
          content: {
            ...(s.content as HeaderContent),
            ...data.content,
            schema_version: '1.0.0',
          },
        }));
        setImportToast({ message: 'Imported profile contact details' });
      } else if (sec.sectionType === 'summary' && data.content) {
        setExpandedEmptyForms((prev) => ({ ...prev, [sec.id]: true }));
        updateSection(sec.id, (s) => ({
          ...s,
          content: data.content,
        }));
        setImportToast({ message: 'Imported 1 entry' });
      } else if (Array.isArray(data.entries) && data.entries.length > 0) {
        const existing = [...((sec.content as EntriesContent<BaseEntry>).entries || [])];
        const merged = [...existing, ...data.entries];
        updateSection(sec.id, (s) => ({
          ...s,
          content: {
            ...(s.content as EntriesContent<BaseEntry>),
            entries: merged,
          },
        }));
        const count = data.entries.length;
        setImportToast({
          message: `Imported ${count} ${count === 1 ? 'entry' : 'entries'}`,
        });
      }
    } catch {
      // Ignore network errors cleanly
    } finally {
      setImportingSectionId(null);
    }
  };

  const toggleSectionVisibility = (sectionId: string) => {
    updateSection(sectionId, (s) => ({ ...s, isVisible: !s.isVisible }));
  };

  const addCustomSection = () => {
    const newSecId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `sec-${Date.now()}`;
    const newSec: DocumentSection = {
      id: newSecId,
      documentId: meta.id,
      sectionType: 'custom',
      title: 'Additional Section',
      orderIndex: sections.length,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: [
          {
            id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `ent-${Date.now()}`,
            title: 'New Item',
            subtitle: '',
            date: '',
            description: '',
            bullets: [],
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = [...sections, newSec];
    setSections(next);
    pushHistory(meta, next);
  };

  const removeSection = (sectionId: string) => {
    const next = sections.filter((s) => s.id !== sectionId);
    setSections(next);
    pushHistory(meta, next);
  };

  // Handle text extracted from settled preview
  const handlePreviewTextExtracted = useCallback(
    (extractedText: string, pageCount: number) => {
      setAtsLoading(true);
      try {
        const report = runAtsReadinessChecks(meta, sections, extractedText, pageCount);
        setAtsReport(report);
      } catch {
        console.error('[ATS_CHECK_ERROR] ATS readiness evaluation failed');
      } finally {
        setAtsLoading(false);
      }
    },
    [meta, sections]
  );

  // Jump to section handler from ATS readiness check
  const handleJumpToSection = useCallback(
    (sectionId?: string, fieldId?: string) => {
      setActiveRailTab('content');
      if (mobileTab !== 'edit') {
        setMobileTab('edit');
      }
      if (sectionId) {
        setCollapsedSections((prev) => ({ ...prev, [sectionId]: false }));
      }
      setTimeout(() => {
        if (sectionId) {
          const el = document.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (fieldId) {
              const specific = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                `[name="${fieldId}"], #${fieldId}`
              );
              if (specific) {
                specific.focus();
                return;
              }
            }
            const body = document.getElementById(`section-body-${sectionId}`) || el;
            const firstInput = body.querySelector<HTMLElement>(
              'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
            );
            firstInput?.focus();
          }
        }
      }, 80);
    },
    [mobileTab]
  );

  // Download PDF handler
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    // If there are unsaved changes, trigger background save to keep database in sync
    if (saveStatus === 'unsaved') {
      handleSave();
    }

    try {
      // Yield to event loop allowing UI to paint pending spinner and disable download button
      await new Promise((resolve) => setTimeout(resolve, 350));
      // Lazy-load PDF renderer only when user clicks Download PDF
      const [{ pdf }, { DocumentPdfRenderer }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/DocumentPdfRenderer'),
      ]);
      const docElement = <DocumentPdfRenderer meta={meta} sections={sections} />;
      const blob = await pdf(docElement).toBlob();

      // Extract applicant name from header for clean cross-platform filename
      const headerSec = sections.find(
        (s) => (s.sectionType || (s as any).section_type) === 'header'
      );
      const applicantName =
        (headerSec?.content as any)?.fullName ||
        (headerSec?.content as any)?.full_name ||
        '';

      const filename = sanitizePdfFilename(applicantName, meta.title, meta.type);

      // Download via blob URL
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke object URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('[PDF_DOWNLOAD_ERROR] Client-side PDF export failed');
      setDownloadError(
        err instanceof Error ? err.message : 'Failed to prepare PDF for download.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Scan document for non-Latin script
  const nonLatinScan = scanDocumentForNonLatin(sections);

  const resolvedLayout = resolvePdfLayout(meta.templateId, meta.layoutSettings);
  const templateDefaults = getTemplateLayoutDefaults(meta.templateId);

  const updateLayoutSettings = useCallback(
    (patch: Partial<LayoutSettings>) => {
      const nextLayout: LayoutSettings = {
        ...(metaRef.current.layoutSettings || {}),
        ...patch,
      };
      const updated: DocumentMeta = {
        ...metaRef.current,
        layoutSettings: nextLayout,
      };
      setMeta(updated);
      pushHistory(updated, sectionsRef.current);
    },
    [pushHistory]
  );

  const resetLayoutSettings = useCallback(() => {
    const updated: DocumentMeta = {
      ...metaRef.current,
      layoutSettings: undefined,
    };
    setMeta(updated);
    pushHistory(updated, sectionsRef.current);
  }, [pushHistory]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#EFE8DE] text-[#24221F]"
      style={{ '--toolbar-h': `${toolbarHeight}px` } as React.CSSProperties}
    >
      {sessionExpired && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-[#FFE4D8] border-b border-[#800021] px-4 py-2.5 flex items-center justify-between text-xs text-[#800021] font-medium sticky top-0 z-40"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Your session has expired. Your current draft is preserved locally. Please sign in again to save.
            </span>
          </div>
          <a
            href={`/login?returnTo=/editor/${meta.id}`}
            className="px-3 py-1 bg-[#800021] text-white rounded font-semibold hover:bg-[#881144] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            Sign in again
          </a>
        </div>
      )}
      {/* Top Application Bar */}
      <header
        ref={headerRef}
        data-glass-panel="true"
        data-glass-variant="dense"
        className="glass-panel border-b glass-divider px-3 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-30"
        style={{ borderRadius: 0 }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-2">
          {/* Back & Document Title (Row 1 on mobile) */}
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <Link
              href="/dashboard"
              className="btn-glass-secondary min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 p-2.5 sm:p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] flex items-center justify-center flex-shrink-0"
              title="Return to Dashboard"
              aria-label="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex flex-col min-w-0 flex-1 sm:flex-initial">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label="Document Title"
                  value={meta.title}
                  onChange={(e) => {
                    const updated = { ...meta, title: e.target.value };
                    setMeta(updated);
                    pushHistory(updated, sections);
                  }}
                  className="font-display font-bold text-sm sm:text-base bg-[#FFFDF9] text-[#24221F] border border-[#D8D0C5] focus:border-[#800021] rounded px-1.5 py-1 sm:py-0.5 w-full sm:w-44 lg:w-56 truncate transition-colors"
                  placeholder="Document Title"
                />
                <span className="hidden xl:inline text-[11px] text-[#FFFDF9] whitespace-nowrap">
                  v{meta.version}
                </span>
              </div>
              <input
                type="text"
                aria-label="Target Role"
                value={meta.targetRole ?? meta.target_role ?? ''}
                onChange={(e) => {
                  const updated = { ...meta, targetRole: e.target.value };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="hidden xl:block text-xs text-[#333333] border border-transparent hover:border-[#6B6B6B] focus:border-[#800021] rounded px-1.5 py-0.2 w-32 sm:w-44 lg:w-56 truncate transition-colors -mt-0.5"
                placeholder="Target Role (optional)"
              />
            </div>
          </div>

          {/* Template, Accents, Undo/Redo, Status, Actions (wraps cleanly below 1024px) */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Template Selector */}
            <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
              <select
                id="template-picker"
                aria-label="Select Template"
                value={meta.templateId}
                onChange={(e) => {
                  const updated = { ...meta, templateId: e.target.value as TemplateId };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="px-2 py-1 min-h-[44px] sm:min-h-0 sm:h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs focus:border-[#800021] focus:ring-1 focus:ring-[#800021]"
              >
                <option value="ats_single_column">ATS Single Column</option>
                <option value="modern_professional">Modern Professional</option>
                <option value="academic_cv">Academic CV</option>
              </select>
            </div>

            {/* Document Status Selector */}
            <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
              <select
                id="document-status-picker"
                aria-label="Document Status"
                value={meta.status || 'draft'}
                onChange={(e) => {
                  const updated = { ...meta, status: e.target.value as DocumentStatus };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="px-2 py-1 min-h-[44px] sm:min-h-0 sm:h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs focus:border-[#800021] focus:ring-1 focus:ring-[#800021]"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
              </select>
            </div>

            {/* Accent Color Picker (desktop only) */}
            <div id="accent-color-picker" className="hidden sm:flex items-center gap-1 flex-shrink-0">
              {ALLOWED_ACCENTS.map((acc) => (
                <button
                  key={acc.hex}
                  type="button"
                  onClick={() => {
                    const updated = { ...meta, accentColor: acc.hex };
                    setMeta(updated);
                    pushHistory(updated, sections);
                  }}
                  aria-label={`Select accent color ${acc.label}`}
                  title={acc.label}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    (meta.accentColor || meta.accent_color || '#0B0B0B').toUpperCase() === acc.hex.toUpperCase()
                      ? 'ring-2 ring-offset-1 ring-[#0B0B0B] scale-110'
                      : 'border-[#6B6B6B] hover:scale-105'
                  }`}
                  style={{ backgroundColor: acc.hex }}
                />
              ))}
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center border border-[#6B6B6B] rounded-md overflow-hidden bg-[#FFFFFF] flex-shrink-0 min-h-[44px] sm:min-h-0 sm:h-8">
              <button
                type="button"
                id="toolbar-btn-undo"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-8 p-2 sm:p-1.5 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
              <div className="w-[1px] h-6 sm:h-4 bg-[#6B6B6B]" />
              <button
                type="button"
                id="toolbar-btn-redo"
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-8 p-2 sm:p-1.5 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            {/* Save Status Slot */}
            <div
              id="save-status-slot"
              aria-live="polite"
              className="w-[145px] flex-shrink-0 min-h-[44px] sm:min-h-0 sm:h-8 inline-flex items-center gap-1.5 px-2 rounded-md bg-[#FFFFFF] border border-transparent text-xs font-semibold overflow-hidden whitespace-nowrap"
            >
              {saveStatus === 'saved' && (
                <span className="text-emerald-700 flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Saved</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-[#800021] flex items-center gap-1.5 truncate">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span className="truncate">Saving...</span>
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-[#333333] flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="truncate">Unsaved changes</span>
                </span>
              )}
              {saveStatus === 'conflict' && (
                <span className="text-[#800021] flex items-center gap-1.5 truncate font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Conflict</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-red-700 flex items-center gap-1.5 truncate font-bold"
                    title={saveError || 'Save failed'}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{saveError || 'Error'}</span>
                  </span>
                  <button
                    type="button"
                    id="toolbar-btn-retry"
                    onClick={() => handleSave()}
                    aria-label="Retry Save"
                    className="ml-1 px-1.5 py-0.5 h-6 text-[10px] font-bold text-[#800021] bg-[#FFE4D8] hover:bg-[#FCD8C8] rounded border border-[#800021] transition-colors focus:outline-none focus:ring-1 focus:ring-[#800021] flex-shrink-0 flex items-center justify-center"
                    title="Retry Save"
                  >
                    Retry
                  </button>
                </div>
              )}
              {saveStatus === 'offline' && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#333333] flex items-center gap-1.5 truncate">
                    <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{saveError || 'Offline'}</span>
                  </span>
                  <button
                    type="button"
                    id="toolbar-btn-retry"
                    onClick={() => handleSave()}
                    aria-label="Retry Save"
                    className="ml-1 px-1.5 py-0.5 h-6 text-[10px] font-bold text-[#800021] bg-[#FFE4D8] hover:bg-[#FCD8C8] rounded border border-[#800021] transition-colors focus:outline-none focus:ring-1 focus:ring-[#800021] flex-shrink-0 flex items-center justify-center"
                    title="Retry Save"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                id="toolbar-btn-save"
                onClick={() => handleSave()}
                disabled={saveStatus === 'saving'}
                aria-busy={saveStatus === 'saving'}
                aria-label="Save"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-3 min-h-[44px] sm:min-h-0 sm:h-8 rounded-md bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
              >
                <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0" aria-hidden="true" /> <span>Save</span>
              </button>

              {/* Tablet (768-1023px) Preview Toggle */}
              <button
                type="button"
                id="tablet-preview-toggle"
                onClick={() => setIsTabletPreviewOpen((prev) => !prev)}
                aria-expanded={isTabletPreviewOpen}
                aria-label={isTabletPreviewOpen ? 'Hide Preview' : 'Show Preview'}
                className="hidden md:inline-flex lg:hidden items-center justify-center gap-1.5 px-2.5 h-8 rounded-md border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] text-xs font-semibold transition-colors flex-shrink-0"
              >
                {isTabletPreviewOpen ? (
                  <>
                    <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hide Preview</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Show Preview</span>
                  </>
                )}
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                id="download-pdf-button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                aria-label="Download PDF"
                aria-busy={isDownloading}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-3 min-h-[44px] sm:min-h-0 sm:h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin text-[#800021] flex-shrink-0" />
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Non-Latin notice in download area */}
        {nonLatinScan.hasNonLatin && (
          <div className="max-w-7xl mx-auto px-4 pt-1.5 pb-0 text-[11px] text-[#800021] font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Notice: Non-Latin characters were omitted from the PDF export.</span>
          </div>
        )}

        {/* Download error alert */}
        {downloadError && (
          <div role="alert" className="max-w-7xl mx-auto px-4 pt-1.5 text-xs text-red-700 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Mobile View Tab Switcher (<768px) */}
        <div className="md:hidden flex border-t border-[#D8D0C5] mt-2.5 pt-2">
          <button
            type="button"
            onClick={() => switchMobileTab('edit')}
            aria-label="Edit Sections Tab"
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center ${
              mobileTab === 'edit'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#706A63]'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => switchMobileTab('preview')}
            aria-label="Live A4 Preview Tab"
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center ${
              mobileTab === 'preview'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#706A63]'
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            id="mobile-ats-tab-btn"
            onClick={() => switchMobileTab('ats')}
            aria-label="ATS Readiness Tab"
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center ${
              mobileTab === 'ats'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#706A63]'
            }`}
          >
            ATS
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-5 py-4 flex flex-col md:flex-row items-start gap-4 lg:gap-5">
        {/* Left Vertical Icon Rail (md+) */}
        <nav
          aria-label="Editor sections"
          id="editor-icon-rail"
          data-glass-panel="true"
          data-glass-variant="dense"
          style={{ top: 'calc(var(--toolbar-h, 57px) + 12px)', borderRadius: '16px' }}
          className="glass-panel hidden md:flex flex-col gap-1.5 w-14 xl:w-16 flex-shrink-0 sticky p-1.5 z-10"
        >
          {(
            [
              { id: 'content', label: 'Content', icon: FileText },
              { id: 'template', label: 'Template', icon: LayoutTemplate },
              { id: 'theme', label: 'Theme', icon: Palette },
              { id: 'page', label: 'Page', icon: SlidersHorizontal },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`rail-tab-${tab.id}`}
                onClick={() => setActiveRailTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                className={`w-full min-h-[48px] px-1 py-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                  isActive
                    ? 'bg-[#800021] text-[#FFFFFF]'
                    : 'text-[#FFFDF9] hover:bg-[rgba(255,253,249,0.14)]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Left Side Panel (Content / Template / Theme / Page) */}
        <div
          className={`flex-1 min-w-0 w-full space-y-4 ${
            mobileTab !== 'edit' ? 'hidden md:block' : 'block'
          } ${isTabletPreviewOpen ? 'md:hidden lg:block' : ''}`}
        >
          {/* Mobile Rail Strip (<768px) */}
          <div
            role="tablist"
            aria-label="Editor panels"
            className="md:hidden grid grid-cols-4 gap-1 bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-1"
          >
            {(
              [
                { id: 'content', label: 'Content', icon: FileText },
                { id: 'template', label: 'Template', icon: LayoutTemplate },
                { id: 'theme', label: 'Theme', icon: Palette },
                { id: 'page', label: 'Page', icon: SlidersHorizontal },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeRailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveRailTab(tab.id)}
                  className={`min-h-[44px] px-1.5 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#800021] text-[#FFFFFF]'
                      : 'text-[#24221F] hover:bg-[#EFE8DE]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeRailTab === 'template' && (
            <section
              id="rail-panel-template"
              aria-label="Template selection"
              className="bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-4 lg:p-5 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-bold text-[#24221F]">Template</h2>
                <p className="text-xs text-[#706A63] mt-0.5">
                  All templates export to single-column A4 PDF with selectable text.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                  {
                    id: 'ats_single_column' as TemplateId,
                    name: 'ATS Single Column',
                    description: 'Clean single-column layout built for applicant tracking systems.',
                    image: '/landing/ats_single_column.png',
                  },
                  {
                    id: 'modern_professional' as TemplateId,
                    name: 'Modern Professional',
                    description: 'Structured hierarchy with subtle accent bars and crisp spacing.',
                    image: '/landing/modern_professional.png',
                  },
                  {
                    id: 'academic_cv' as TemplateId,
                    name: 'Academic CV',
                    description: 'Serif typography tailored for publications, grants, and teaching.',
                    image: '/landing/academic_cv.png',
                  },
                ].map((tpl) => {
                  const selected = meta.templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      id={`template-card-${tpl.id}`}
                      onClick={() => {
                        const updated = { ...meta, templateId: tpl.id };
                        setMeta(updated);
                        pushHistory(updated, sections);
                      }}
                      aria-pressed={selected}
                      className={`text-left rounded-xl border p-3 transition-colors flex flex-col gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                        selected
                          ? 'border-[#800021] bg-[#EFE8DE]/60 ring-1 ring-[#800021]'
                          : 'border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE]/40'
                      }`}
                    >
                      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-[#D8D0C5] bg-[#FFFFFF]">
                        <Image
                          src={tpl.image}
                          alt={`${tpl.name} specimen preview`}
                          fill
                          sizes="(max-width: 768px) 100vw, 240px"
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#24221F]">{tpl.name}</span>
                          {selected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#800021]">
                              <Check className="w-3 h-3" aria-hidden="true" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#706A63] leading-snug">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeRailTab === 'theme' && (
            <section
              id="rail-panel-theme"
              aria-label="Theme accent color"
              className="bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-4 lg:p-5 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-bold text-[#24221F]">Theme</h2>
                <p className="text-xs text-[#706A63] mt-0.5">
                  Choose an accent color from the verified high-contrast palette.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALLOWED_ACCENTS.map((acc) => {
                  const selected =
                    (meta.accentColor || meta.accent_color || '#0B0B0B').toUpperCase() ===
                    acc.hex.toUpperCase();
                  return (
                    <button
                      key={acc.hex}
                      type="button"
                      onClick={() => {
                        const updated = { ...meta, accentColor: acc.hex };
                        setMeta(updated);
                        pushHistory(updated, sections);
                      }}
                      aria-pressed={selected}
                      className={`min-h-[44px] px-3 py-2 rounded-lg border flex items-center justify-between gap-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                        selected
                          ? 'border-[#800021] bg-[#EFE8DE]/60 ring-1 ring-[#800021]'
                          : 'border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE]/40'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full border border-[#D8D0C5] flex-shrink-0"
                          style={{ backgroundColor: acc.hex }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-[#24221F]">{acc.label}</span>
                      </span>
                      <span className="text-[11px] font-mono text-[#706A63]">{acc.hex}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeRailTab === 'page' && (
            <section
              id="rail-panel-page"
              aria-label="Page typography and layout settings"
              className="bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-4 lg:p-5 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#24221F]">Page</h2>
                  <p className="text-xs text-[#706A63] mt-0.5">
                    Adjust typography, spacing, and A4 page options.
                  </p>
                </div>
                <button
                  type="button"
                  id="page-settings-reset-btn"
                  onClick={resetLayoutSettings}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-md border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-xs font-medium text-[#24221F] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#24221F]">
                  Font family
                </label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Font family">
                  {(['Noto Sans', 'Noto Serif'] as PdfFontFamily[]).map((font) => {
                    const selected = resolvedLayout.fontFamily === font;
                    return (
                      <button
                        key={font}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        id={`page-font-${font.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => updateLayoutSettings({ fontFamily: font })}
                        className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                          selected
                            ? 'border-[#800021] bg-[#EFE8DE]/70 text-[#800021] ring-1 ring-[#800021]'
                            : 'border-[#D8D0C5] bg-[#FFFDF9] text-[#24221F] hover:bg-[#EFE8DE]/40'
                        }`}
                      >
                        {font}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="page-font-size-slider" className="font-semibold text-[#24221F]">
                    Font size
                  </label>
                  <span id="page-font-size-value" className="font-mono text-[#706A63] tabular-nums">
                    {resolvedLayout.fontSize.toFixed(1)} pt
                  </span>
                </div>
                <input
                  id="page-font-size-slider"
                  type="range"
                  min={8.5}
                  max={12}
                  step={0.5}
                  value={resolvedLayout.fontSize}
                  onChange={(e) => updateLayoutSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-[#800021] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#706A63]">
                  <span>8.5 pt</span>
                  <span>Default {templateDefaults.fontSize} pt</span>
                  <span>12 pt</span>
                </div>
              </div>

              {/* Line Height Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="page-line-height-slider" className="font-semibold text-[#24221F]">
                    Line height
                  </label>
                  <span id="page-line-height-value" className="font-mono text-[#706A63] tabular-nums">
                    {resolvedLayout.lineHeight.toFixed(2)}
                  </span>
                </div>
                <input
                  id="page-line-height-slider"
                  type="range"
                  min={1.15}
                  max={1.6}
                  step={0.05}
                  value={resolvedLayout.lineHeight}
                  onChange={(e) => updateLayoutSettings({ lineHeight: Number(e.target.value) })}
                  className="w-full accent-[#800021] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#706A63]">
                  <span>1.15</span>
                  <span>Default {templateDefaults.lineHeight}</span>
                  <span>1.60</span>
                </div>
              </div>

              {/* Page Margin Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="page-margin-slider" className="font-semibold text-[#24221F]">
                    Page margin
                  </label>
                  <span id="page-margin-value" className="font-mono text-[#706A63] tabular-nums">
                    {resolvedLayout.pageMargin} pt
                  </span>
                </div>
                <input
                  id="page-margin-slider"
                  type="range"
                  min={24}
                  max={56}
                  step={2}
                  value={resolvedLayout.pageMargin}
                  onChange={(e) => updateLayoutSettings({ pageMargin: Number(e.target.value) })}
                  className="w-full accent-[#800021] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#706A63]">
                  <span>24 pt</span>
                  <span>Default {templateDefaults.pageMargin} pt</span>
                  <span>56 pt</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-[#D8D0C5]">
                <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                  <div>
                    <span className="block text-xs font-semibold text-[#24221F]">Underline links</span>
                    <span className="block text-[11px] text-[#706A63]">
                      Show underlines on email, portfolio, and publication links.
                    </span>
                  </div>
                  <input
                    id="page-underline-links-toggle"
                    type="checkbox"
                    checked={resolvedLayout.underlineLinks}
                    onChange={(e) => updateLayoutSettings({ underlineLinks: e.target.checked })}
                    className="w-4 h-4 accent-[#800021] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                  <div>
                    <span className="block text-xs font-semibold text-[#24221F]">Page numbers</span>
                    <span className="block text-[11px] text-[#706A63]">
                      Display a subtle &ldquo;1 / 2&rdquo; footer on every page.
                    </span>
                  </div>
                  <input
                    id="page-numbers-toggle"
                    type="checkbox"
                    checked={resolvedLayout.pageNumbers}
                    onChange={(e) => updateLayoutSettings({ pageNumbers: e.target.checked })}
                    className="w-4 h-4 accent-[#800021] rounded cursor-pointer"
                  />
                </label>
              </div>
            </section>
          )}

          {/* Content Tab: Sections & Entry Editing */}
          <div
            key={`editor-revision-${editorRevision}`}
            className={`space-y-4 ${activeRailTab === 'content' ? 'block' : 'hidden'}`}
          >
          {/* Master Profile Copy Meta Card */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-[#0B0B0B]">
                Independent Document Copy
              </span>
              <p className="text-[#333333] mt-0.5">
                Copied from your master profile on {(meta.createdAt || meta.created_at || '').slice(0, 10) || 'recent'}. Edits made here only affect this document.
              </p>
            </div>
            <button
              type="button"
              onClick={addCustomSection}
              aria-label="Add Custom Section"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-xs font-medium text-[#0B0B0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Add Custom Section
            </button>
          </div>

          {/* Non-Latin Script Warning Banner */}
          {nonLatinScan.hasNonLatin && (
            <div className="bg-[#FFE4D8] border border-[#800021] rounded-xl p-4 text-xs text-[#800021] space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Non-Latin Script Detected</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#333333]">
                Due to PDF font shaping limitations, non-Latin text (Devanagari, Cyrillic, Arabic, etc.) cannot be cleanly rendered in PDF exports and will be omitted from the compiled output. The following fields contain non-Latin characters:
              </p>
              <ul className="list-disc list-inside text-[11px] text-[#800021] font-medium space-y-0.5">
                {nonLatinScan.affectedFields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Live region for drag-and-drop & keyboard reorder announcements */}
          <div id="section-reorder-live" role="status" aria-live="polite" className="sr-only">
            {reorderAnnouncement}
          </div>

          {/* Section List Accordion / Sortable Panels */}
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((sec, idx) => {
                const hc = sec.content as HeaderContent;
                const headerEmpty =
                  sec.sectionType === 'header' &&
                  !expandedEmptyForms[sec.id] &&
                  !String(hc.fullName || (hc as any).full_name || '').trim() &&
                  !String(hc.email || '').trim() &&
                  !String(hc.phone || '').trim() &&
                  !String(hc.headline || '').trim();
                const sc = sec.content as SummaryContent;
                const summaryEmpty =
                  sec.sectionType === 'summary' &&
                  !expandedEmptyForms[sec.id] &&
                  !String(sc.text || '').trim();

                return (
                <SortableSectionCard
                  key={sec.id}
                  section={sec}
                  index={idx}
                  totalCount={sections.length}
                  isCollapsed={Boolean(collapsedSections[sec.id])}
                  isFocused={focusedSectionId === sec.id}
                  onToggleCollapse={() =>
                    setCollapsedSections((prev) => ({
                      ...prev,
                      [sec.id]: !prev[sec.id],
                    }))
                  }
                  onFocusSection={() => setFocusedSectionId(sec.id)}
                  onBlurSection={() => {
                    setFocusedSectionId((prev) => (prev === sec.id ? null : prev));
                  }}
                  onTitleChange={(title) =>
                    updateSection(sec.id, (s) => ({ ...s, title }))
                  }
                  onToggleVisibility={() => toggleSectionVisibility(sec.id)}
                  onMove={(dir) => moveSection(idx, dir)}
                  onDeleteCustom={
                    sec.sectionType === 'custom'
                      ? () => removeSection(sec.id)
                      : undefined
                  }
                >
                  {/* Section Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* 1. Header Section */}
                    {sec.sectionType === 'header' && (
                      headerEmpty ? (
                          <SectionEmptyState
                            sectionType="header"
                            onAdd={() =>
                              setExpandedEmptyForms((prev) => ({ ...prev, [sec.id]: true }))
                            }
                            onImport={() => handleImportFromMasterProfile(sec)}
                            isImporting={importingSectionId === sec.id}
                            noMasterData={Boolean(noMasterDataSections[sec.id])}
                          />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-lg bg-[#EFE8DE] border border-[#D8D0C5]">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        id="fullName"
                        maxLength={255}
                        aria-invalid={Boolean(fieldErrors['fullName'] || fieldErrors['full_name'])}
                        aria-describedby={fieldErrors['fullName'] || fieldErrors['full_name'] ? 'error-fullName' : undefined}
                        value={(sec.content as HeaderContent).fullName || (sec.content as any).full_name || ''}
                        onChange={(e) => {
                          setFieldErrors((prev) => ({ ...prev, fullName: '', full_name: '' }));
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              fullName: e.target.value.slice(0, 255),
                              full_name: e.target.value.slice(0, 255),
                            },
                          }));
                        }}
                        className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                          fieldErrors['fullName'] || fieldErrors['full_name']
                            ? 'border-[#800021] ring-1 ring-[#800021]'
                            : 'border-[#6B6B6B]'
                        }`}
                      />
                      {(fieldErrors['fullName'] || fieldErrors['full_name']) && (
                        <p id="error-fullName" className="text-xs text-[#800021] mt-1 font-semibold">
                          {fieldErrors['fullName'] || fieldErrors['full_name']}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Professional Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        maxLength={150}
                        aria-invalid={Boolean(fieldErrors['email'])}
                        aria-describedby={fieldErrors['email'] ? 'error-email' : undefined}
                        value={(sec.content as HeaderContent).email || ''}
                        onChange={(e) => {
                          setFieldErrors((prev) => ({ ...prev, email: '' }));
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              email: e.target.value.slice(0, 150),
                            },
                          }));
                        }}
                        className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                          fieldErrors['email']
                            ? 'border-[#800021] ring-1 ring-[#800021]'
                            : 'border-[#6B6B6B]'
                        }`}
                      />
                      {fieldErrors['email'] && (
                        <p id="error-email" className="text-xs text-[#800021] mt-1 font-semibold">
                          {fieldErrors['email']}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Phone (optional)
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        aria-invalid={Boolean(fieldErrors['phone'])}
                        aria-describedby={fieldErrors['phone'] ? 'error-phone' : undefined}
                        value={(sec.content as HeaderContent).phone || ''}
                        onChange={(e) => {
                          setFieldErrors((prev) => ({ ...prev, phone: '' }));
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              phone: e.target.value.slice(0, 100),
                            },
                          }));
                        }}
                        className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                          fieldErrors['phone']
                            ? 'border-[#800021] ring-1 ring-[#800021]'
                            : 'border-[#6B6B6B]'
                        }`}
                      />
                      {fieldErrors['phone'] && (
                        <p id="error-phone" className="text-xs text-[#800021] mt-1 font-semibold">
                          {fieldErrors['phone']}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          maxLength={150}
                          aria-invalid={Boolean(fieldErrors['city'])}
                          aria-describedby={fieldErrors['city'] ? 'error-city' : undefined}
                          value={(sec.content as HeaderContent).city || ''}
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, city: '' }));
                            const val = e.target.value.slice(0, 150);
                            updateSection(sec.id, (s) => ({
                              ...s,
                              content: {
                                ...(s.content as HeaderContent),
                                city: val,
                              },
                            }));
                          }}
                          className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                            fieldErrors['city']
                              ? 'border-[#800021] ring-1 ring-[#800021]'
                              : 'border-[#6B6B6B]'
                          }`}
                        />
                        {fieldErrors['city'] && (
                          <p id="error-city" className="text-xs text-[#800021] mt-1 font-semibold">
                            {fieldErrors['city']}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          maxLength={150}
                          aria-invalid={Boolean(fieldErrors['country'])}
                          aria-describedby={fieldErrors['country'] ? 'error-country' : undefined}
                          value={(sec.content as HeaderContent).country || ''}
                          onChange={(e) => {
                            setFieldErrors((prev) => ({ ...prev, country: '' }));
                            const val = e.target.value.slice(0, 150);
                            updateSection(sec.id, (s) => ({
                              ...s,
                              content: {
                                ...(s.content as HeaderContent),
                                country: val,
                              },
                            }));
                          }}
                          className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                            fieldErrors['country']
                              ? 'border-[#800021] ring-1 ring-[#800021]'
                              : 'border-[#6B6B6B]'
                          }`}
                        />
                        {fieldErrors['country'] && (
                          <p id="error-country" className="text-xs text-[#800021] mt-1 font-semibold">
                            {fieldErrors['country']}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Professional Headline
                      </label>
                      <input
                        type="text"
                        name="headline"
                        id="contact-headline"
                        aria-label="Professional Headline"
                        maxLength={300}
                        aria-invalid={Boolean(fieldErrors['headline'])}
                        aria-describedby={fieldErrors['headline'] ? 'error-headline' : undefined}
                        value={(sec.content as HeaderContent).headline || ''}
                        onChange={(e) => {
                          setFieldErrors((prev) => ({ ...prev, headline: '' }));
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              headline: e.target.value.slice(0, 300),
                            },
                          }));
                        }}
                        className={`w-full px-3 py-1.5 rounded border bg-[#FFFFFF] text-[#0B0B0B] ${
                          fieldErrors['headline']
                            ? 'border-[#800021] ring-1 ring-[#800021]'
                            : 'border-[#6B6B6B]'
                        }`}
                      />
                      {fieldErrors['headline'] && (
                        <p id="error-headline" className="text-xs text-[#800021] mt-1 font-semibold">
                          {fieldErrors['headline']}
                        </p>
                      )}
                    </div>
                  </div>
                      )
                    )}

                {/* 2. Summary Section */}
                {sec.sectionType === 'summary' && (
                  summaryEmpty ? (
                      <SectionEmptyState
                        sectionType="summary"
                        onAdd={() =>
                          setExpandedEmptyForms((prev) => ({ ...prev, [sec.id]: true }))
                        }
                        onImport={() => handleImportFromMasterProfile(sec)}
                        isImporting={importingSectionId === sec.id}
                        noMasterData={Boolean(noMasterDataSections[sec.id])}
                      />
                  ) : (
                  <div className="p-3.5 rounded-lg bg-[#EFE8DE] border border-[#D8D0C5]">
                    <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                      Summary Text
                    </label>
                    <textarea
                      rows={4}
                      maxLength={FIELD_LIMITS.summary}
                      aria-invalid={Boolean(fieldErrors['text'] || fieldErrors['summary'])}
                      aria-describedby={fieldErrors['text'] || fieldErrors['summary'] ? 'error-summary' : undefined}
                      value={(sec.content as SummaryContent).text || ''}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, text: '', summary: '' }));
                        updateSection(sec.id, (s) => ({
                          ...s,
                          content: {
                            ...(s.content as SummaryContent),
                            text: e.target.value.slice(0, 5000),
                          },
                        }));
                      }}
                      className={`w-full px-3 py-2 rounded border bg-[#FFFFFF] text-[#0B0B0B] text-xs leading-relaxed ${
                        fieldErrors['text'] || fieldErrors['summary']
                          ? 'border-[#800021] ring-1 ring-[#800021]'
                          : 'border-[#6B6B6B]'
                      }`}
                    />
                    {(fieldErrors['text'] || fieldErrors['summary']) && (
                      <p id="error-summary" className="text-xs text-[#800021] mt-1 font-semibold">
                        {fieldErrors['text'] || fieldErrors['summary']}
                      </p>
                    )}
                  </div>
                  )
                )}

                {/* 3. Entries Sections (Education, Experience, Projects, Skills, etc.) */}
                {sec.sectionType !== 'header' && sec.sectionType !== 'summary' && (
                  <div className="space-y-3">
                    {/* Honest empty state */}
                    {(!(sec.content as EntriesContent<BaseEntry>).entries ||
                      (sec.content as EntriesContent<BaseEntry>).entries.length === 0) && (
                      <SectionEmptyState
                        sectionType={sec.sectionType || 'custom'}
                        onAdd={() => addEmptyEntryToSection(sec)}
                        onImport={() => handleImportFromMasterProfile(sec)}
                        isImporting={importingSectionId === sec.id}
                        noMasterData={Boolean(noMasterDataSections[sec.id])}
                      />
                    )}

                    {/* Entry Cards */}
                    {(((sec.content as any).entries as any[]) || []).map((entry, eIdx) => (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-lg border border-[#D8D0C5] bg-[#EFE8DE] space-y-2.5 text-xs shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#6B6B6B] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0B0B0B]">
                              Entry #{eIdx + 1}
                            </span>
                            {entry.isVisible === false && (
                              <span className="text-[10px] bg-[#FFE4D8] text-[#800021] px-1.5 py-0.5 rounded font-medium">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-1 flex-wrap self-end sm:self-auto">
                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={eIdx === 0}
                              onClick={() => {
                                if (eIdx === 0) return;
                                const currentEntries = [...(((sec.content as any).entries as any[]) || [])];
                                const temp = currentEntries[eIdx];
                                currentEntries[eIdx] = currentEntries[eIdx - 1];
                                currentEntries[eIdx - 1] = temp;
                                updateSection(sec.id, (s) => ({
                                  ...s,
                                  content: { ...s.content, entries: currentEntries } as any,
                                }));
                              }}
                              aria-label={`Move Entry ${eIdx + 1} Up`}
                              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 p-2 sm:p-1 flex items-center justify-center rounded border border-[#6B6B6B] sm:border-transparent text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move entry up"
                            >
                              <ChevronUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={eIdx === (((sec.content as any).entries as any[]) || []).length - 1}
                              onClick={() => {
                                const currentEntries = [...(((sec.content as any).entries as any[]) || [])];
                                if (eIdx >= currentEntries.length - 1) return;
                                const temp = currentEntries[eIdx];
                                currentEntries[eIdx] = currentEntries[eIdx + 1];
                                currentEntries[eIdx + 1] = temp;
                                updateSection(sec.id, (s) => ({
                                  ...s,
                                  content: { ...s.content, entries: currentEntries } as any,
                                }));
                              }}
                              aria-label={`Move Entry ${eIdx + 1} Down`}
                              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 p-2 sm:p-1 flex items-center justify-center rounded border border-[#6B6B6B] sm:border-transparent text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move entry down"
                            >
                              <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                            {/* Toggle Entry Visibility */}
                            <button
                              type="button"
                              onClick={() => {
                                const currentEntries = [...(((sec.content as any).entries as any[]) || [])];
                                currentEntries[eIdx] = {
                                  ...currentEntries[eIdx],
                                  isVisible: currentEntries[eIdx].isVisible === false ? true : false,
                                };
                                updateSection(sec.id, (s) => ({
                                  ...s,
                                  content: { ...s.content, entries: currentEntries } as any,
                                }));
                              }}
                              aria-label={entry.isVisible === false ? `Show Entry ${eIdx + 1}` : `Hide Entry ${eIdx + 1}`}
                              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 p-2 sm:p-1 flex items-center justify-center rounded border border-[#6B6B6B] sm:border-transparent text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7]"
                              title={entry.isVisible === false ? 'Show entry in PDF' : 'Hide entry from PDF'}
                            >
                              {entry.isVisible === false ? (
                                <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#800021]" />
                              ) : (
                                <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              )}
                            </button>
                            {/* Remove Entry */}
                            <button
                              type="button"
                              onClick={() => {
                                const currentEntries = [
                                  ...(((sec.content as any).entries as any[]) || []),
                                ];
                                currentEntries.splice(eIdx, 1);
                                updateSection(sec.id, (s) => ({
                                  ...s,
                                  content: {
                                    ...s.content,
                                    entries: currentEntries,
                                  } as any,
                                }));
                              }}
                              aria-label={`Delete Entry ${eIdx + 1}`}
                              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 p-2 sm:p-1 flex items-center justify-center rounded border border-[#6B6B6B] sm:border-transparent text-red-700 hover:text-red-900 hover:bg-[#FFE4D8] transition-colors"
                              title="Remove entry"
                            >
                              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Education entry fields */}
                        {sec.sectionType === 'education' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Institution
                              </label>
                              <input
                                type="text"
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors['institution'])}
                                aria-describedby={fieldErrors['institution'] ? 'error-edu-inst' : undefined}
                                value={(entry.institution as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, institution: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], institution: e.target.value.slice(0, 255) };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['institution'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {fieldErrors['institution'] && (
                                <p id="error-edu-inst" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['institution']}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Degree / Certificate
                              </label>
                              <input
                                type="text"
                                maxLength={200}
                                aria-invalid={Boolean(fieldErrors['degree'])}
                                aria-describedby={fieldErrors['degree'] ? 'error-edu-deg' : undefined}
                                value={(entry.degree as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, degree: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], degree: e.target.value.slice(0, 200) };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['degree'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {fieldErrors['degree'] && (
                                <p id="error-edu-deg" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['degree']}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Experience entry fields */}
                        {sec.sectionType === 'experience' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Role / Title
                              </label>
                              <input
                                id="input-exp-role"
                                type="text"
                                aria-invalid={Boolean(fieldErrors['role'])}
                                aria-describedby={fieldErrors['role'] ? 'error-exp-role' : undefined}
                                value={(entry.role as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, role: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], role: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['role'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {fieldErrors['role'] && (
                                <p id="error-exp-role" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['role']}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Organization / Company
                              </label>
                              <input
                                type="text"
                                aria-invalid={Boolean(fieldErrors['organization'])}
                                aria-describedby={fieldErrors['organization'] ? 'error-exp-org' : undefined}
                                value={(entry.organization as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, organization: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], organization: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['organization'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {fieldErrors['organization'] && (
                                <p id="error-exp-org" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['organization']}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Certifications entry fields */}
                        {sec.sectionType === 'certifications' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Certification Name
                              </label>
                              <input
                                type="text"
                                maxLength={255}
                                aria-invalid={Boolean(fieldErrors['name'])}
                                aria-describedby={fieldErrors['name'] ? 'error-cert-name' : undefined}
                                value={(entry.name as string) || (entry.title as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    name: e.target.value.slice(0, 255),
                                    title: e.target.value.slice(0, 255),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['name'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {fieldErrors['name'] && (
                                <p id="error-cert-name" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['name']}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Issuing Organization
                              </label>
                              <input
                                type="text"
                                maxLength={200}
                                aria-invalid={Boolean(fieldErrors['issuingOrg'] || fieldErrors['issuer'])}
                                aria-describedby={fieldErrors['issuingOrg'] || fieldErrors['issuer'] ? 'error-cert-issuer' : undefined}
                                value={(entry.issuingOrg as string) || (entry.issuer as string) || ''}
                                onChange={(e) => {
                                  setFieldErrors((prev) => ({ ...prev, issuingOrg: '', issuer: '' }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    issuingOrg: e.target.value.slice(0, 200),
                                    issuer: e.target.value.slice(0, 200),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className={`w-full px-2.5 py-1 rounded border ${
                                  fieldErrors['issuingOrg'] || fieldErrors['issuer'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                }`}
                              />
                              {(fieldErrors['issuingOrg'] || fieldErrors['issuer']) && (
                                <p id="error-cert-issuer" className="text-xs text-[#800021] mt-1 font-semibold">
                                  {fieldErrors['issuingOrg'] || fieldErrors['issuer']}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Achievements entry fields */}
                        {sec.sectionType === 'achievements' && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                  Award / Honor Title
                                </label>
                                <input
                                  type="text"
                                  maxLength={255}
                                  aria-invalid={Boolean(fieldErrors['title'])}
                                  aria-describedby={fieldErrors['title'] ? 'error-ach-title' : undefined}
                                  value={(entry.title as string) || (entry.name as string) || ''}
                                  onChange={(e) => {
                                    setFieldErrors((prev) => ({ ...prev, title: '' }));
                                    const entries = [...(((sec.content as any).entries as any[]) || [])];
                                    entries[eIdx] = {
                                      ...entries[eIdx],
                                      title: e.target.value.slice(0, 255),
                                      name: e.target.value.slice(0, 255),
                                    };
                                    updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                  }}
                                  className={`w-full px-2.5 py-1 rounded border ${
                                    fieldErrors['title'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                  }`}
                                />
                                {fieldErrors['title'] && (
                                  <p id="error-ach-title" className="text-xs text-[#800021] mt-1 font-semibold">
                                    {fieldErrors['title']}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                  Grantor / Organization (optional)
                                </label>
                                <input
                                  type="text"
                                  maxLength={200}
                                  aria-invalid={Boolean(fieldErrors['issuer'])}
                                  aria-describedby={fieldErrors['issuer'] ? 'error-ach-issuer' : undefined}
                                  value={(entry.issuer as string) || ''}
                                  onChange={(e) => {
                                    setFieldErrors((prev) => ({ ...prev, issuer: '' }));
                                    const entries = [...(((sec.content as any).entries as any[]) || [])];
                                    entries[eIdx] = {
                                      ...entries[eIdx],
                                      issuer: e.target.value.slice(0, 200),
                                    };
                                    updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                  }}
                                  className={`w-full px-2.5 py-1 rounded border ${
                                    fieldErrors['issuer'] ? 'border-[#800021] ring-1 ring-[#800021]' : 'border-[#6B6B6B]'
                                  }`}
                                />
                                {fieldErrors['issuer'] && (
                                  <p id="error-ach-issuer" className="text-xs text-[#800021] mt-1 font-semibold">
                                    {fieldErrors['issuer']}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Description (optional)
                              </label>
                              <textarea
                                rows={2}
                                maxLength={FIELD_LIMITS.achievementDescription}
                                value={(entry.description as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    description: e.target.value.slice(0, FIELD_LIMITS.achievementDescription),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B] text-xs leading-relaxed"
                              />
                            </div>
                          </div>
                        )}

                        {/* Skills entry fields */}
                        {sec.sectionType === 'skills' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Category Name (e.g. Languages, Frameworks)
                              </label>
                              <input
                                type="text"
                                maxLength={100}
                                aria-label={`Category Name for Entry ${eIdx + 1}`}
                                value={(entry.category as string) || (entry.title as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    category: e.target.value.slice(0, 100),
                                    title: e.target.value.slice(0, 100),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                                placeholder="e.g. Programming Languages"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Skills (comma-separated)
                              </label>
                              <input
                                type="text"
                                aria-label={`Skills List for Entry ${eIdx + 1}`}
                                value={
                                  Array.isArray(entry.items)
                                    ? entry.items.map((it: any) => (typeof it === 'string' ? it : it.name || '')).filter(Boolean).join(', ')
                                    : (entry.subtitle as string) || ''
                                }
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const items = raw
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .map((name) => ({ name: name.slice(0, 100) }));
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    items,
                                    subtitle: raw,
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                                placeholder="e.g. React, TypeScript, Tailwind CSS, Next.js"
                              />
                            </div>
                          </div>
                        )}

                        {/* Project / Publication / Custom fields */}
                        {(sec.sectionType === 'projects' ||
                          sec.sectionType === 'publications' ||
                          sec.sectionType === 'custom') && (
                          <div>
                            <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                              Title / Name
                            </label>
                            <input
                              type="text"
                              maxLength={300}
                              aria-label={`Title or Name for Entry ${eIdx + 1}`}
                              value={
                                (entry.title as string) ||
                                (entry.name as string) ||
                                ''
                              }
                              onChange={(e) => {
                                const entries = [...(((sec.content as any).entries as any[]) || [])];
                                entries[eIdx] = {
                                  ...entries[eIdx],
                                  title: e.target.value.slice(0, 300),
                                  name: e.target.value.slice(0, 300),
                                };
                                updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                              }}
                              className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                            />
                          </div>
                        )}

                        {/* Bullets editor for entries that support bullets */}
                        {Array.isArray(entry.bullets) && (
                          <div>
                            <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                              Bullet Points (one per line)
                            </label>
                            <textarea
                              rows={3}
                              aria-label={`Bullet Points for Entry ${eIdx + 1}`}
                              value={(entry.bullets as string[]).join('\n')}
                              onChange={(e) => {
                                const lines = e.target.value
                                  .split('\n')
                                  .filter((l) => l.trim().length > 0);
                                const entries = [...(((sec.content as any).entries as any[]) || [])];
                                entries[eIdx] = { ...entries[eIdx], bullets: lines };
                                updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded border border-[#6B6B6B] text-xs leading-relaxed"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Entry Button (shown when entries already exist; empty state provides primary CTA when empty) */}
                    {((sec.content as EntriesContent<BaseEntry>).entries || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => addEmptyEntryToSection(sec)}
                        aria-label={`Add Entry to ${sec.title || sec.sectionType}`}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-md border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-xs font-semibold text-[#24221F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
                      >
                        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Add Entry
                      </button>
                    )}
                  </div>
                )}
                  </div>
                </SortableSectionCard>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
        </div>

        {/* Right Column: Live A4 Preview & ATS Readiness */}
        <div
          style={{
            top: 'calc(var(--toolbar-h, 57px) + 12px)',
            height: 'calc(100dvh - var(--toolbar-h, 57px) - 24px)',
          }}
          className={`w-full lg:w-[420px] xl:w-[500px] 2xl:w-[540px] flex-shrink-0 md:sticky flex-col ${
            mobileTab === 'edit'
              ? isTabletPreviewOpen
                ? 'hidden md:flex md:flex-1 md:min-w-0 lg:flex-none lg:w-[420px]'
                : 'hidden lg:flex'
              : 'flex'
          }`}
        >
          {/* Desktop Right Column Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#FFFDF9] border border-[#D8D0C5] p-1 rounded-xl mb-3 shadow-xs">
            <button
              type="button"
              id="right-tab-preview"
              onClick={() => {
                switchRightTab('preview');
                if (mobileTab === 'ats') switchMobileTab('preview');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  switchRightTab('preview');
                  if (mobileTab === 'ats') switchMobileTab('preview');
                }
              }}
              className={`flex-1 min-h-[44px] sm:min-h-0 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center ${
                (mobileTab === 'ats' ? false : activeRightTab === 'preview')
                  ? 'bg-[#800021] text-[#FFFFFF] shadow-xs'
                  : 'text-[#24221F] hover:bg-[#EFE8DE]'
              }`}
            >
              Live A4 Preview
            </button>
            <button
              type="button"
              id="right-tab-ats"
              onClick={() => {
                switchRightTab('ats');
                if (mobileTab === 'preview') switchMobileTab('ats');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  switchRightTab('ats');
                  if (mobileTab === 'preview') switchMobileTab('ats');
                }
              }}
              className={`flex-1 min-h-[44px] sm:min-h-0 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-colors inline-flex items-center justify-center gap-1.5 ${
                (mobileTab === 'ats' || activeRightTab === 'ats')
                  ? 'bg-[#800021] text-[#FFFFFF] shadow-xs'
                  : 'text-[#24221F] hover:bg-[#EFE8DE]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>ATS Readiness</span>
            </button>
          </div>

          {/* Live Preview Container (lazy-mounted only when preview is visible) */}
          <div
            className={`flex-1 min-h-0 ${
              (mobileTab === 'ats' || activeRightTab === 'ats') ? 'hidden' : 'block'
            }`}
          >
            {hasMountedPreview && (
              <LivePdfPreview
                meta={meta}
                sections={sections}
                onTextExtracted={handlePreviewTextExtracted}
              />
            )}
          </div>

          {/* ATS Readiness Panel Container */}
          <div
            ref={atsScrollRef}
            id="ats-panel-scroll-container"
            className={`flex-1 min-h-0 overflow-y-auto ${
              (mobileTab === 'ats' || activeRightTab === 'ats') ? 'block' : 'hidden'
            }`}
          >
            <AtsReadinessPanel
              report={atsReport}
              isLoading={atsLoading}
              onJumpToSection={(sectionId) => {
                setActiveRailTab('content');
                handleJumpToSection(sectionId);
              }}
            />
          </div>
        </div>
      </main>

      {/* Save Conflict Modal */}
      {conflictData && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="save-conflict-title"
          aria-describedby="save-conflict-desc"
          onKeyDown={handleConflictModalKeyDown}
          className="fixed inset-0 z-50 bg-[#0B0B0B]/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#800021] font-bold text-base">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span id="save-conflict-title">Save Conflict (Version {conflictData.serverVersion})</span>
            </div>
            <p id="save-conflict-desc" className="text-xs text-[#333333] leading-relaxed">
              This document was updated in another session or tab while you were editing. <strong>Reload Server Copy</strong> discards the edits you made in this tab and updates both the editor and the preview with the latest server copy. <strong>Keep My Version as New Copy</strong> preserves all your edits by creating a separate new document in your dashboard without overwriting the server copy.
            </p>

            {copyError && (
              <div role="alert" className="p-2.5 rounded-lg bg-[#FFE4D8] border border-[#800021] text-xs font-semibold text-[#800021] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{copyError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                ref={conflictReloadBtnRef}
                type="button"
                id="conflict-btn-reload"
                disabled={isCreatingCopy || isReloadingServer}
                aria-busy={isReloadingServer}
                onClick={handleConflictReload}
                aria-label="Reload Server Copy"
                className="min-h-[44px] px-4 py-2.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 text-center"
              >
                {isReloadingServer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
                    <span>Reloading...</span>
                  </>
                ) : (
                  <span>Reload Server Copy</span>
                )}
              </button>
              <button
                ref={conflictKeepCopyBtnRef}
                type="button"
                id="conflict-btn-keep-copy"
                disabled={isCreatingCopy || isReloadingServer}
                aria-busy={isCreatingCopy}
                onClick={handleConflictKeepCopy}
                aria-label="Keep My Version as New Copy"
                className="min-h-[44px] px-4 py-2.5 rounded-md bg-[#800021] text-xs font-semibold text-[#FFFFFF] hover:bg-[#881144] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-center"
              >
                {isCreatingCopy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
                    <span>Creating copy...</span>
                  </>
                ) : (
                  <span>Keep My Version as New Copy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Success Toast */}
      {copySuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#235347] text-[#FFFFFF] px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{copySuccessToast}</span>
        </div>
      )}

      {/* Import Success Toast with Undo */}
      {importToast && (
        <div
          id="import-success-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#24221F] text-[#FFFFFF] px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-3"
        >
          <CheckCircle2 className="w-4 h-4 text-[#DAF1DE] flex-shrink-0" aria-hidden="true" />
          <span>{importToast.message}</span>
          <button
            type="button"
            id="import-toast-undo-btn"
            onClick={() => {
              handleUndo();
              setImportToast(null);
            }}
            className="px-2 py-1 rounded bg-[#FFFDF9] text-[#24221F] hover:bg-[#EFE8DE] text-[11px] font-bold transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            aria-label="Dismiss import notice"
            onClick={() => setImportToast(null)}
            className="text-[#D8D0C5] hover:text-[#FFFFFF] text-xs px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Draft Recovery Modal */}
      {draftPrompt && (
        <div className="fixed inset-0 z-50 bg-[#0B0B0B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#0B0B0B] font-bold text-base">
              <Sparkles className="w-5 h-5 text-[#800021] flex-shrink-0" />
              <span>Unsaved Draft Found</span>
            </div>
            <p className="text-xs text-[#333333] leading-relaxed">
              You have unsaved changes saved in this browser from a previous editing session. Would you like to restore your local draft or continue with the server copy?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-4 py-2 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] transition-colors"
              >
                Discard &amp; Use Server Copy
              </button>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-4 py-2 rounded-md bg-[#800021] text-xs font-semibold text-[#FFFFFF] hover:bg-[#881144] transition-colors"
              >
                Restore Local Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
