'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DocumentMeta,
  DocumentSection,
  TemplateId,
  BaseEntry,
  HeaderContent,
  SummaryContent,
  EntriesContent,
  SectionContent,
} from '@/lib/documents/types';
import { LivePdfPreview } from '@/components/editor/LivePdfPreview';
import { scanDocumentForNonLatin } from '@/lib/validation/pdf-text';
import { pdf } from '@react-pdf/renderer';
import { DocumentPdfRenderer } from '@/components/pdf/DocumentPdfRenderer';
import { sanitizePdfFilename } from '@/lib/pdf/filename';
import { runAtsReadinessChecks } from '@/lib/ats/checker';
import { AtsReadinessPanel } from '@/components/editor/AtsReadinessPanel';
import { AtsReadinessReport } from '@/lib/ats/types';
import { isDocumentContentEqual } from '@/lib/utils/deep-equal';
import { FIELD_LIMITS } from '@/lib/validation/field-limits';
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



export function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const router = useRouter();

  // Document state
  const [meta, setMeta] = useState<DocumentMeta>(initialDocument.meta);
  const [sections, setSections] = useState<DocumentSection[]>(initialDocument.sections);

  // Mutable refs to track latest editor state across async network boundaries
  const metaRef = useRef<DocumentMeta>(initialDocument.meta);
  const sectionsRef = useRef<DocumentSection[]>(initialDocument.sections);
  const isSavingRef = useRef<boolean>(false);
  const handleSaveRef = useRef<((overrideMeta?: DocumentMeta, overrideSections?: DocumentSection[]) => Promise<void>) | null>(null);

  useEffect(() => {
    metaRef.current = meta;
    sectionsRef.current = sections;
  }, [meta, sections]);

  // Exact snapshot of last successfully saved document content
  const lastSavedSnapshotRef = useRef<{
    meta: DocumentMeta;
    sections: DocumentSection[];
  }>({
    meta: initialDocument.meta,
    sections: initialDocument.sections,
  });

  // Debounced autosave coalescing timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Undo / Redo history stack (up to 50 snapshots)
  const historyRef = useRef<Array<{ meta: DocumentMeta; sections: DocumentSection[] }>>([
    { meta: initialDocument.meta, sections: initialDocument.sections },
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

  // Draft recovery modal
  const [draftPrompt, setDraftPrompt] = useState<{
    draft: { meta: DocumentMeta; sections: DocumentSection[] };
  } | null>(null);

  // Field validation errors & session expiration state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sessionExpired, setSessionExpired] = useState(false);

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
      if (isSavingRef.current) return;

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
            },
            sections: sentSections.map((s, idx) => {
              let contentPayload: SectionContent = s.content;
              if (s.sectionType === 'certifications' && contentPayload && typeof contentPayload === 'object') {
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
            serverDoc: resData.serverDoc,
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
      }
    },
    []
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
          handleSave(newMeta, newSections);
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
    [handleSave]
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
      setMeta(draftPrompt.draft.meta);
      setSections(draftPrompt.draft.sections);
      pushHistory(draftPrompt.draft.meta, draftPrompt.draft.sections);
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
          handleSave(restoredMeta, snap.sections);
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: restoredMeta, sections: snap.sections, timestamp: Date.now() })
          );
        } catch {}
      }
    }
  }, [handleSave]);

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
          handleSave(restoredMeta, snap.sections);
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: restoredMeta, sections: snap.sections, timestamp: Date.now() })
          );
        } catch {}
      }
    }
  }, [handleSave]);

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
      if (mobileTab !== 'edit') {
        setMobileTab('edit');
      }
      setTimeout(() => {
        if (sectionId) {
          const el = document.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (fieldId) {
              const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                `[name="${fieldId}"], #${fieldId}`
              );
              input?.focus();
            }
          }
        }
      }, 50);
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
      // Generate PDF client-side from the exact same renderer
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

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#0B0B0B]">
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
      <header className="bg-[#FFFFFF] border-b border-[#6B6B6B] px-3 sm:px-4 py-2.5 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto">
          {/* Back & Document Title */}
          <div className="flex items-center gap-2 flex-shrink min-w-0">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-md border border-[#6B6B6B] hover:bg-[#F1F7F7] text-[#0B0B0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex flex-col min-w-0">
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
                  className="font-display font-bold text-sm sm:text-base text-[#0B0B0B] border border-transparent hover:border-[#6B6B6B] focus:border-[#800021] rounded px-1.5 py-0.5 w-32 sm:w-44 lg:w-56 truncate transition-colors"
                  placeholder="Document Title"
                />
                <span className="hidden xl:inline text-[11px] text-[#333333] whitespace-nowrap">
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

          {/* Template, Accents, Undo/Redo, Status, Actions (One row, flex-nowrap) */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
            {/* Template Selector */}
            <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
              <select
                id="template-picker"
                value={meta.templateId}
                onChange={(e) => {
                  const updated = { ...meta, templateId: e.target.value as TemplateId };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="px-2 py-1 h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs focus:border-[#800021] focus:ring-1 focus:ring-[#800021]"
              >
                <option value="ats_single_column">ATS Single Column</option>
                <option value="modern_professional">Modern Professional</option>
                <option value="academic_cv">Academic CV</option>
              </select>
            </div>

            {/* Accent Color Picker */}
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
            <div className="flex items-center border border-[#6B6B6B] rounded-md overflow-hidden bg-[#FFFFFF] flex-shrink-0 h-8">
              <button
                type="button"
                id="toolbar-btn-undo"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className="p-1.5 w-7 h-8 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-[#6B6B6B]" />
              <button
                type="button"
                id="toolbar-btn-redo"
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className="p-1.5 w-7 h-8 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Status Slot (Fixed-width slot: 145px, flex-shrink-0, h-8, no layout shift) */}
            <div
              id="save-status-slot"
              aria-live="polite"
              className="w-[145px] flex-shrink-0 h-8 inline-flex items-center gap-1.5 px-2 rounded-md bg-[#FFFFFF] border border-transparent text-xs font-semibold overflow-hidden whitespace-nowrap"
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
                    className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-[#800021] bg-[#FFE4D8] hover:bg-[#FCD8C8] rounded border border-[#800021] transition-colors focus:outline-none focus:ring-1 focus:ring-[#800021] flex-shrink-0"
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
                    className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-[#800021] bg-[#FFE4D8] hover:bg-[#FCD8C8] rounded border border-[#800021] transition-colors focus:outline-none focus:ring-1 focus:ring-[#800021] flex-shrink-0"
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
                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
              >
                <Save className="w-3.5 h-3.5 flex-shrink-0" /> <span>Save</span>
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                id="download-pdf-button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                aria-label="Download PDF"
                aria-busy={isDownloading}
                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#800021] flex-shrink-0" />
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[#800021] flex-shrink-0" />
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
        <div className="md:hidden flex border-t border-[#6B6B6B] mt-2.5 pt-2">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-1.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              mobileTab === 'edit'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#333333]'
            }`}
          >
            Edit Sections
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              mobileTab === 'preview'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#333333]'
            }`}
          >
            Live A4 Preview
          </button>
          <button
            type="button"
            id="mobile-ats-tab-btn"
            onClick={() => setMobileTab('ats')}
            className={`flex-1 py-1.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              mobileTab === 'ats'
                ? 'border-[#800021] text-[#800021]'
                : 'border-transparent text-[#333333]'
            }`}
          >
            ATS Readiness
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sections & Entry Editing (7 cols on desktop) */}
        <div
          className={`space-y-4 md:col-span-7 ${
            mobileTab === 'preview' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Master Profile Copy Meta Card */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-xs flex items-center justify-between text-xs">
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-xs font-medium text-[#0B0B0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Section
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

          {/* Section List Accordion / Panels */}
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              id={sec.id}
              data-section-type={sec.sectionType}
              style={{ backgroundColor: sec.isVisible ? '#FFFFFF' : '#F1F7F7' }}
              className={`border border-[#6B6B6B] rounded-xl overflow-hidden shadow-xs transition-colors ${
                sec.isVisible ? 'bg-[#FFFFFF]' : 'bg-[#F1F7F7]'
              }`}
            >
              {/* Section Header Controls */}
              <div
                className={`p-3.5 sm:px-5 border-b border-[#6B6B6B] flex items-center justify-between gap-3 ${
                  sec.isVisible ? 'bg-[#FFFFFF]' : 'bg-[#F1F7F7]'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-mono font-bold text-[#333333] w-5">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) =>
                      updateSection(sec.id, (s) => ({ ...s, title: e.target.value }))
                    }
                    className="font-display font-bold text-sm sm:text-base text-[#0B0B0B] border border-transparent hover:border-[#6B6B6B] focus:border-[#800021] rounded px-2 py-0.5 flex-1 transition-colors"
                  />
                  <span className="text-[10px] uppercase font-semibold text-[#5D6B6B] px-1.5 py-0.5 rounded border border-[#6B6B6B]">
                    {sec.sectionType}
                  </span>
                  {!sec.isVisible && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#800021] bg-[#FFE4D8] border border-[#800021]/30 px-2 py-0.5 rounded-md">
                      <EyeOff className="w-3 h-3" /> Hidden from PDF
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Reorder Up / Down */}
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'up')}
                    disabled={idx === 0}
                    aria-label={`Move ${sec.title} Up`}
                    className="p-1 rounded border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] disabled:opacity-20 text-[#0B0B0B] transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    aria-label={`Move ${sec.title} Down`}
                    className="p-1 rounded border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] disabled:opacity-20 text-[#0B0B0B] transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Hide / Show Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSectionVisibility(sec.id)}
                    aria-label={sec.isVisible ? `Hide ${sec.title}` : `Show ${sec.title}`}
                    className={`p-1 rounded border border-[#6B6B6B] transition-colors ${
                      sec.isVisible
                        ? 'bg-[#FFFFFF] text-[#0B0B0B] hover:bg-[#F1F7F7]'
                        : 'bg-[#FFE4D8] text-[#800021]'
                    }`}
                  >
                    {sec.isVisible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Remove Custom Section */}
                  {sec.sectionType === 'custom' && (
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      aria-label={`Delete ${sec.title}`}
                      className="p-1 rounded border border-[#6B6B6B] text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* 1. Header Section */}
                {sec.sectionType === 'header' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                )}

                {/* 2. Summary Section */}
                {sec.sectionType === 'summary' && (
                  <div>
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
                )}

                {/* 3. Entries Sections (Education, Experience, Projects, Skills, etc.) */}
                {sec.sectionType !== 'header' && sec.sectionType !== 'summary' && (
                  <div className="space-y-3">
                    {/* Honest empty state */}
                    {(!(sec.content as EntriesContent<BaseEntry>).entries ||
                      (sec.content as EntriesContent<BaseEntry>).entries.length === 0) && (
                      <div className="p-4 rounded-lg bg-[#F1F7F7] border border-[#6B6B6B] text-xs text-[#333333] text-center">
                        No entries yet in this section. Add an entry below or copy from your master profile.
                      </div>
                    )}

                    {/* Entry Cards */}
                    {(((sec.content as any).entries as any[]) || []).map((entry, eIdx) => (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] space-y-2.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-2">
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
                          <div className="flex items-center gap-1">
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
                              className="p-1 rounded text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move entry up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
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
                              className="p-1 rounded text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move entry down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
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
                              className="p-1 rounded text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7]"
                              title={entry.isVisible === false ? 'Show entry in PDF' : 'Hide entry from PDF'}
                            >
                              {entry.isVisible === false ? (
                                <EyeOff className="w-3.5 h-3.5 text-[#800021]" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
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
                              className="p-1 rounded text-red-700 hover:text-red-900 hover:bg-[#F1F7F7] transition-colors ml-1"
                              title="Remove entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

                    {/* Add Entry Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newEntryId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `ent-${Date.now()}`;
                        const currentEntries = [
                          ...((sec.content as EntriesContent<BaseEntry>).entries || []),
                        ];
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
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-xs font-semibold text-[#0B0B0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Live A4 Preview & ATS Readiness (5 cols on desktop) */}
        <div
          className={`h-[calc(100vh-100px)] sticky top-20 md:col-span-5 flex flex-col ${
            mobileTab === 'edit' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Desktop Right Column Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#6B6B6B] p-1 rounded-xl mb-3 shadow-xs">
            <button
              type="button"
              id="right-tab-preview"
              onClick={() => {
                setActiveRightTab('preview');
                if (mobileTab === 'ats') setMobileTab('preview');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveRightTab('preview');
                  if (mobileTab === 'ats') setMobileTab('preview');
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-colors ${
                (mobileTab === 'ats' ? false : activeRightTab === 'preview')
                  ? 'bg-[#800021] text-[#FFFFFF] shadow-xs'
                  : 'text-[#333333] hover:bg-[#F1F7F7] hover:text-[#0B0B0B]'
              }`}
            >
              Live A4 Preview
            </button>
            <button
              type="button"
              id="right-tab-ats"
              onClick={() => {
                setActiveRightTab('ats');
                if (mobileTab === 'preview') setMobileTab('ats');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveRightTab('ats');
                  if (mobileTab === 'preview') setMobileTab('ats');
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-colors inline-flex items-center justify-center gap-1.5 ${
                (mobileTab === 'ats' || activeRightTab === 'ats')
                  ? 'bg-[#800021] text-[#FFFFFF] shadow-xs'
                  : 'text-[#333333] hover:bg-[#F1F7F7] hover:text-[#0B0B0B]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>ATS Readiness</span>
            </button>
          </div>

          {/* Live Preview Container (kept mounted so preview compiles & extracts text) */}
          <div
            className={`flex-1 min-h-0 ${
              (mobileTab === 'ats' || activeRightTab === 'ats') ? 'hidden' : 'block'
            }`}
          >
            <LivePdfPreview
              meta={meta}
              sections={sections}
              onTextExtracted={handlePreviewTextExtracted}
            />
          </div>

          {/* ATS Readiness Panel Container */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto ${
              (mobileTab === 'ats' || activeRightTab === 'ats') ? 'block' : 'hidden'
            }`}
          >
            <AtsReadinessPanel
              report={atsReport}
              isLoading={atsLoading}
              onJumpToSection={handleJumpToSection}
            />
          </div>
        </div>
      </main>

      {/* Save Conflict Modal */}
      {conflictData && (
        <div className="fixed inset-0 z-50 bg-[#0B0B0B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#800021] font-bold text-base">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Save Conflict (Version {conflictData.serverVersion})</span>
            </div>
            <p className="text-xs text-[#333333] leading-relaxed">
              This document was updated in another session or tab while you were editing. Would you like to reload the latest server copy or keep your version as a separate new copy?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMeta(conflictData.serverDoc.meta);
                  setSections(conflictData.serverDoc.sections);
                  setConflictData(null);
                  setSaveStatus('saved');
                }}
                className="px-4 py-2 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-xs font-semibold text-[#0B0B0B] hover:bg-[#F1F7F7] transition-colors"
              >
                Reload Server Copy
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Duplicate user's local version as new document
                  const res = await fetch('/api/documents/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: meta.type,
                      templateId: meta.templateId,
                      title: `${meta.title} (Recovered Copy)`,
                      accentColor: meta.accentColor,
                    }),
                  });
                  const data = await res.json();
                  if (data.documentId) {
                    router.push(`/editor/${data.documentId}`);
                  }
                }}
                className="px-4 py-2 rounded-md bg-[#800021] text-xs font-semibold text-[#FFFFFF] hover:bg-[#881144] transition-colors"
              >
                Keep My Version as New Copy
              </button>
            </div>
          </div>
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
