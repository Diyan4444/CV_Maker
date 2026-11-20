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
  Clock,
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

function isDocumentContentEqual(
  aMeta: DocumentMeta,
  aSections: DocumentSection[],
  bMeta: DocumentMeta,
  bSections: DocumentSection[]
): boolean {
  if (aMeta.title !== bMeta.title) return false;
  if (aMeta.templateId !== bMeta.templateId) return false;
  if ((aMeta.accentColor || '#0B0B0B').toUpperCase() !== (bMeta.accentColor || '#0B0B0B').toUpperCase()) return false;
  if ((aMeta.targetRole ?? '') !== (bMeta.targetRole ?? '')) return false;
  if ((aMeta.targetCompany ?? '') !== (bMeta.targetCompany ?? '')) return false;

  if (aSections.length !== bSections.length) return false;

  for (let i = 0; i < aSections.length; i++) {
    const a = aSections[i];
    const b = bSections[i];
    if (a.id !== b.id) return false;
    if (a.sectionType !== b.sectionType) return false;
    if (a.title !== b.title) return false;
    if (a.orderIndex !== b.orderIndex) return false;
    if (Boolean(a.isVisible) !== Boolean(b.isVisible)) return false;
    if (JSON.stringify(a.content) !== JSON.stringify(b.content)) return false;
  }

  return true;
}

export function DocumentEditor({ initialDocument }: DocumentEditorProps) {
  const router = useRouter();

  // Document state
  const [meta, setMeta] = useState<DocumentMeta>(initialDocument.meta);
  const [sections, setSections] = useState<DocumentSection[]>(initialDocument.sections);

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
      const currentMeta = overrideMeta || meta;
      const currentSections = overrideSections || sections;

      if (saveStatus === 'saving') return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      setSaveStatus('saving');
      setSaveError(null);

      try {
        const res = await fetch(`/api/documents/${currentMeta.id}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientVersion: currentMeta.version,
            meta: {
              title: currentMeta.title,
              templateId: currentMeta.templateId,
              accentColor: currentMeta.accentColor,
              targetRole: currentMeta.targetRole,
            },
            sections: currentSections.map((s, idx) => {
              let contentPayload: SectionContent = s.content;
              if (s.sectionType === 'certifications' && contentPayload && typeof contentPayload === 'object') {
                const c = contentPayload as unknown as Record<string, unknown>;
                if (Array.isArray(c.entries)) {
                  contentPayload = {
                    ...c,
                    entries: c.entries.map((entry: Record<string, unknown>) => ({
                      ...entry,
                      id: (entry.id as string) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cert-${Date.now()}`),
                      name: (entry.name || entry.title || 'Certification Name')?.toString().trim().slice(0, 500),
                      issuingOrg: (entry.issuingOrg || entry.issuer || 'Certification Authority')?.toString().trim().slice(0, 300),
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
                      title: (entry.title || entry.name || 'Achievement Title')?.toString().trim().slice(0, 500),
                      issuer: entry.issuer ? entry.issuer.toString().trim().slice(0, 300) : undefined,
                    })),
                  } as unknown as SectionContent;
                }
              } else if (s.sectionType === 'header' && contentPayload && typeof contentPayload === 'object') {
                const h = contentPayload as HeaderContent;
                contentPayload = {
                  ...h,
                  phone: h.phone ? String(h.phone).trim().slice(0, 100) : undefined,
                  city: h.city ? String(h.city).trim().slice(0, 255) : undefined,
                  country: h.country ? String(h.country).trim().slice(0, 255) : undefined,
                  location: h.location ? String(h.location).trim().slice(0, 255) : undefined,
                } as HeaderContent;
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

        if (res.status === 409) {
          setSaveStatus('conflict');
          setConflictData({
            serverVersion: resData.serverVersion,
            serverDoc: resData.serverDoc,
          });
          return;
        }

        if (!res.ok) {
          throw new Error(resData.error || 'Failed to save document.');
        }

        // Update version & update lastSavedSnapshotRef
        const updatedMeta = {
          ...currentMeta,
          version: resData.newVersion,
          updatedAt: resData.updatedAt,
        };
        setMeta(updatedMeta);
        lastSavedSnapshotRef.current = {
          meta: updatedMeta,
          sections: JSON.parse(JSON.stringify(currentSections)),
        };
        setSaveStatus('saved');

        // Clear local draft once saved
        try {
          localStorage.removeItem(`cv_maker_draft_${currentMeta.id}`);
        } catch {}
      } catch (err: unknown) {
        console.error('Save failed:', err);
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Save failed.');
      }
    },
    [saveStatus, meta, sections]
  );

  // Push snapshot to undo stack
  const pushHistory = useCallback(
    (newMeta: DocumentMeta, newSections: DocumentSection[]) => {
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
        setSaveStatus('unsaved');
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
      setMeta(snap.meta);
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
        snap.meta,
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
        setSaveStatus('unsaved');
        saveTimerRef.current = setTimeout(() => {
          handleSave(snap.meta, snap.sections);
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: snap.meta, sections: snap.sections, timestamp: Date.now() })
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
      setMeta(snap.meta);
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
        snap.meta,
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
        setSaveStatus('unsaved');
        saveTimerRef.current = setTimeout(() => {
          handleSave(snap.meta, snap.sections);
        }, 1500);

        try {
          localStorage.setItem(
            `cv_maker_draft_${snap.meta.id}`,
            JSON.stringify({ meta: snap.meta, sections: snap.sections, timestamp: Date.now() })
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
      } catch (err) {
        console.error('ATS check failed:', err);
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
      console.error('Download PDF error:', err);
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
      {/* Top Application Bar */}
      <header className="bg-[#FFFFFF] border-b border-[#6B6B6B] px-4 py-3 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Back & Document Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-md border border-[#6B6B6B] hover:bg-[#F1F7F7] text-[#0B0B0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex-1 md:flex-initial">
              <input
                type="text"
                aria-label="Document Title"
                value={meta.title}
                onChange={(e) => {
                  const updated = { ...meta, title: e.target.value };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="font-display font-bold text-base sm:text-lg text-[#0B0B0B] border border-transparent hover:border-[#6B6B6B] focus:border-[#800021] rounded px-2 py-0.5 w-full md:w-72 transition-colors"
                placeholder="Document Title"
              />
              <div className="text-[11px] text-[#333333] px-2 flex items-center gap-2">
                <span className="capitalize">{meta.type}</span> &bull;
                <span>Version {meta.version}</span>
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
                className="text-xs text-[#333333] border border-transparent hover:border-[#6B6B6B] focus:border-[#800021] rounded px-2 py-0.5 w-full md:w-72 transition-colors mt-0.5"
                placeholder="Target Role (optional)"
              />
            </div>
          </div>

          {/* Template & Accent Pickers */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Template Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <label htmlFor="template-picker" className="text-[#333333] hidden sm:inline">
                Template:
              </label>
              <select
                id="template-picker"
                value={meta.templateId}
                onChange={(e) => {
                  const updated = { ...meta, templateId: e.target.value as TemplateId };
                  setMeta(updated);
                  pushHistory(updated, sections);
                }}
                className="px-2.5 py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs focus:border-[#800021] focus:ring-1 focus:ring-[#800021]"
              >
                <option value="ats_single_column">ATS-Friendly Single Column</option>
                <option value="modern_professional">Modern Professional</option>
                <option value="academic_cv">Academic CV</option>
              </select>
            </div>

            {/* Accent Color Picker */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-[#333333] hidden sm:inline">Accent:</span>
              <div id="accent-color-picker" className="flex items-center gap-1">
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
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      (meta.accentColor || meta.accent_color || '#0B0B0B').toUpperCase() === acc.hex.toUpperCase()
                        ? 'ring-2 ring-offset-1 ring-[#0B0B0B] scale-110'
                        : 'border-[#6B6B6B] hover:scale-105'
                    }`}
                    style={{ backgroundColor: acc.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center border border-[#6B6B6B] rounded-md overflow-hidden bg-[#FFFFFF] flex-shrink-0">
              <button
                type="button"
                id="toolbar-btn-undo"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className="p-1.5 w-7 h-7 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
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
                className="p-1.5 w-7 h-7 flex items-center justify-center hover:bg-[#F1F7F7] disabled:opacity-30 text-[#0B0B0B] transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Status Slot (Fixed-width slot: 140px, flex-shrink-0, h-8, no layout shift) */}
            <div
              id="save-status-slot"
              aria-live="polite"
              className="w-[140px] flex-shrink-0 h-8 inline-flex items-center gap-1.5 px-2 rounded-md bg-[#FFFFFF] border border-transparent text-xs font-semibold overflow-hidden whitespace-nowrap"
            >
              {saveStatus === 'saved' && (
                <span className="text-emerald-700 flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Saved</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-[#800021] flex items-center gap-1.5 truncate animate-pulse">
                  <Clock className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
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
                <span
                  className="text-red-700 flex items-center gap-1.5 truncate font-bold"
                  title={saveError || 'Save failed'}
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Error</span>
                </span>
              )}
              {saveStatus === 'offline' && (
                <span className="text-[#333333] flex items-center gap-1.5 truncate">
                  <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Offline</span>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                id="toolbar-btn-save"
                onClick={() => handleSave()}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 rounded-md bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021]"
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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021]"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#800021] flex-shrink-0" />
                    <span>Preparing PDF...</span>
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
                        value={(sec.content as HeaderContent).fullName || (sec.content as any).full_name || ''}
                        onChange={(e) =>
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              fullName: e.target.value,
                              full_name: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Professional Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={(sec.content as HeaderContent).email || ''}
                        onChange={(e) =>
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              email: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Phone (optional)
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={(sec.content as HeaderContent).phone || ''}
                        onChange={(e) =>
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              phone: e.target.value.slice(0, 100),
                            },
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={(sec.content as HeaderContent).city || ''}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 100);
                            updateSection(sec.id, (s) => ({
                              ...s,
                              content: {
                                ...(s.content as HeaderContent),
                                city: val,
                              },
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={(sec.content as HeaderContent).country || ''}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 100);
                            updateSection(sec.id, (s) => ({
                              ...s,
                              content: {
                                ...(s.content as HeaderContent),
                                country: val,
                              },
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#0B0B0B] mb-1">
                        Professional Headline
                      </label>
                      <input
                        type="text"
                        value={(sec.content as HeaderContent).headline || ''}
                        onChange={(e) =>
                          updateSection(sec.id, (s) => ({
                            ...s,
                            content: {
                              ...(s.content as HeaderContent),
                              headline: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B]"
                      />
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
                      value={(sec.content as SummaryContent).text || ''}
                      onChange={(e) =>
                        updateSection(sec.id, (s) => ({
                          ...s,
                          content: {
                            ...(s.content as SummaryContent),
                            text: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs leading-relaxed"
                    />
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
                                value={(entry.institution as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], institution: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Degree / Certificate
                              </label>
                              <input
                                type="text"
                                value={(entry.degree as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], degree: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
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
                                type="text"
                                value={(entry.role as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], role: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Organization / Company
                              </label>
                              <input
                                type="text"
                                value={(entry.organization as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = { ...entries[eIdx], organization: e.target.value };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
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
                                maxLength={300}
                                value={(entry.name as string) || (entry.title as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    name: e.target.value.slice(0, 300),
                                    title: e.target.value.slice(0, 300),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Issuing Organization
                              </label>
                              <input
                                type="text"
                                maxLength={200}
                                value={(entry.issuingOrg as string) || (entry.issuer as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    issuingOrg: e.target.value.slice(0, 200),
                                    issuer: e.target.value.slice(0, 200),
                                  };
                                  updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                }}
                                className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                              />
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
                                  maxLength={300}
                                  value={(entry.title as string) || (entry.name as string) || ''}
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
                              <div>
                                <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                  Grantor / Organization (optional)
                                </label>
                                <input
                                  type="text"
                                  maxLength={200}
                                  value={(entry.issuer as string) || ''}
                                  onChange={(e) => {
                                    const entries = [...(((sec.content as any).entries as any[]) || [])];
                                    entries[eIdx] = {
                                      ...entries[eIdx],
                                      issuer: e.target.value.slice(0, 200),
                                    };
                                    updateSection(sec.id, (s) => ({ ...s, content: { ...s.content, entries } as any }));
                                  }}
                                  className="w-full px-2.5 py-1 rounded border border-[#6B6B6B]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#0B0B0B]">
                                Description (optional)
                              </label>
                              <textarea
                                rows={2}
                                maxLength={1500}
                                value={(entry.description as string) || ''}
                                onChange={(e) => {
                                  const entries = [...(((sec.content as any).entries as any[]) || [])];
                                  entries[eIdx] = {
                                    ...entries[eIdx],
                                    description: e.target.value.slice(0, 1500),
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
                          institution: sec.sectionType === 'education' ? 'Institution Name' : '',
                          degree: sec.sectionType === 'education' ? 'Degree / Program' : '',
                          role: sec.sectionType === 'experience' ? 'Role / Title' : '',
                          organization: sec.sectionType === 'experience' ? 'Company Name' : '',
                          title: sec.sectionType === 'achievements' ? 'Achievement Title' : sec.sectionType === 'projects' || sec.sectionType === 'publications' || sec.sectionType === 'custom' ? 'Title' : '',
                          category: sec.sectionType === 'skills' ? 'New Category' : '',
                          items: [],
                          authors: [],
                          name: sec.sectionType === 'certifications' ? 'Certification Name' : '',
                          issuingOrg: sec.sectionType === 'certifications' ? 'Issuing Organization' : '',
                          issuer: sec.sectionType === 'achievements' ? 'Organization' : sec.sectionType === 'certifications' ? 'Issuing Organization' : '',
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
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-colors inline-flex items-center justify-center gap-1.5 ${
                (mobileTab === 'ats' || activeRightTab === 'ats')
                  ? 'bg-[#800021] text-[#FFFFFF] shadow-xs'
                  : 'text-[#333333] hover:bg-[#F1F7F7] hover:text-[#0B0B0B]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>ATS Readiness</span>
              {atsReport && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    (mobileTab === 'ats' || activeRightTab === 'ats')
                      ? 'bg-[#FFFFFF] text-[#800021]'
                      : 'bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B]'
                  }`}
                >
                  {atsReport.summary.passCount}/10
                </span>
              )}
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
