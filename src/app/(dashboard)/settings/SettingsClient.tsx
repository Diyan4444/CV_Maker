'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { safeNextPath } from '@/lib/navigation/safe-redirect';
import { useToast } from '@/components/ui/ToastProvider';
import { FloatCard } from '@/components/ui/FloatCard';
import {
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Mail,
  Key,
  ExternalLink,
  X,
} from 'lucide-react';

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    createdAt?: string;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const toast = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  const openDeleteModal = useCallback(() => {
    setConfirmEmail('');
    setErrorMsg(null);
    setReauthRequired(false);
    setSubmitting(false);
    isSubmittingRef.current = false;
    setDeleteDialogOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isSubmittingRef.current) return;
    setDeleteDialogOpen(false);
    setConfirmEmail('');
    setErrorMsg(null);
    setReauthRequired(false);
    setSubmitting(false);
  }, []);

  // Focus management and Escape key listener for alertdialog
  useEffect(() => {
    if (!deleteDialogOpen) return;

    // Set initial focus
    const timer = setTimeout(() => {
      confirmInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape closes without deleting (never destructive)
        closeDeleteModal();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteDialogOpen, closeDeleteModal]);

  const isEmailMatched =
    confirmEmail.trim().toLowerCase() === user.email.trim().toLowerCase();

  const handleDeleteAccount = async () => {
    if (!isEmailMatched || isSubmittingRef.current || submitting) {
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setErrorMsg(null);
    setReauthRequired(false);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
        },
        body: JSON.stringify({ confirmEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403 && data.code === 'REAUTH_REQUIRED') {
          setReauthRequired(true);
          setErrorMsg(
            'For your security, account deletion requires a recent sign-in within the last 15 minutes. Please sign in again to verify your identity.'
          );
        } else {
          setErrorMsg(data.error || 'Failed to delete account. Please try again.');
        }
        setSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      // Success: clear local drafts and application keys from localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('cv_maker_') ||
              key.startsWith('quillfolio_') ||
              key.startsWith('sb-'))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (storageErr) {
        console.warn('Failed to clear localStorage keys on account deletion:', storageErr);
      }

      // Hard redirect to flush client caches, in-memory state, and session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/goodbye';
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSignOutAndReauth = () => {
    const target = safeNextPath('/settings', '/dashboard');
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/auth/signout?next=${encodeURIComponent(`/login?next=${encodeURIComponent(target)}`)}`;
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active';

  return (
    <div className="space-y-6">
      {/* Page Title Panel */}
      <FloatCard floatIndex={1} className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-[#F1F7F7] text-[#800021] border border-[#6B6B6B]">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0B] tracking-tight">
              Account &amp; Settings
            </h1>
            <p className="text-xs sm:text-sm text-[#333333] mt-1 leading-relaxed">
              Manage your personal credentials, exercise your data portability rights, and configure security.
            </p>
          </div>
        </div>
      </FloatCard>

      {/* SECTION 1: ACCOUNT DETAILS */}
      <FloatCard
        as="section"
        floatIndex={2}
        aria-labelledby="section-account-title"
        className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-8 shadow-sm space-y-6 min-w-0"
      >
        <div className="border-b border-[#6B6B6B] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h2 id="section-account-title" className="font-display text-lg font-bold text-[#0B0B0B]">
              Account Profile
            </h2>
            <p className="text-xs text-[#333333] mt-0.5">
              Verified identity information and account creation timestamp.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B]">
            Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#333333] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#800021]" aria-hidden="true" />
              Primary Email
            </span>
            <p className="text-xs font-medium text-[#0B0B0B] break-all">{user.email}</p>
          </div>

          <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#333333] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#800021]" aria-hidden="true" />
              Account Created
            </span>
            <p className="text-xs font-medium text-[#0B0B0B]">{formattedDate}</p>
          </div>
        </div>

        <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#333333] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#800021]" aria-hidden="true" />
            User Identification Key
          </span>
          <p className="font-mono text-xs text-[#0B0B0B] break-all select-all">{user.id}</p>
        </div>
      </FloatCard>

      {/* SECTION 2: YOUR DATA & EXPORT */}
      <section
        aria-labelledby="section-data-title"
        className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-8 shadow-sm space-y-6 min-w-0"
      >
        <div className="border-b border-[#6B6B6B] pb-4">
          <h2 id="section-data-title" className="font-display text-lg font-bold text-[#0B0B0B]">
            Your Data &amp; Portability
          </h2>
          <p className="text-xs text-[#333333] mt-0.5 leading-relaxed">
            Download a complete, machine-readable JSON archive containing all your facts, profile records, and documents.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg text-xs text-[#333333] space-y-2 leading-relaxed">
            <p className="font-semibold text-[#0B0B0B]">Archive Specification:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Includes 100% of user-owned records across all 14 database entities.</li>
              <li>Includes all custom document sections, template assignments, and visual accents.</li>
              <li>Contains zero service secrets, encryption keys, or password credentials.</li>
              <li>Export is generated on demand directly from the transactional database.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <a
              href="/api/account/export"
              download
              onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export all data (JSON)</span>
            </a>

            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800021] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded py-2 min-h-[44px]"
            >
              <span>Privacy &amp; Data Rights Notice</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 3: DANGER ZONE */}
      <section
        aria-labelledby="section-danger-title"
        className="bg-[#FFFFFF] border-2 border-[#800021] rounded-xl p-4 sm:p-8 shadow-sm space-y-6 min-w-0"
      >
        <div className="border-b border-[#FFE4D8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h2 id="section-danger-title" className="font-display text-lg font-bold text-[#800021] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#800021]" aria-hidden="true" />
              Danger Zone
            </h2>
            <p className="text-xs text-[#333333] mt-0.5">
              Permanent and irreversible account removal.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-[#333333] leading-relaxed">
            Permanently delete your account and remove all personal information, master profile facts, documents, and telemetry. Once deleted, this data cannot be recovered.
          </p>

          <button
            type="button"
            onClick={openDeleteModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Delete Account</span>
          </button>
        </div>
      </section>

      {/* ACCESSIBLE ALERTDIALOG MODAL */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="bg-[#FFFFFF] border-2 border-[#800021] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative text-[#0B0B0B]"
          >
            {/* Close Button (Escape / Cancel) */}
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={submitting}
              className="absolute right-4 top-4 p-2 text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
              aria-label="Close dialog without deleting"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Header */}
            <div className="space-y-2 pr-6">
              <div className="w-10 h-10 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center text-[#800021]">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 id="delete-dialog-title" className="font-display text-xl font-bold text-[#800021]">
                Delete Account &amp; All Data
              </h3>
              <p id="delete-dialog-desc" className="text-xs text-[#333333] leading-relaxed">
                This action is <strong className="text-[#0B0B0B]">permanent and irreversible</strong>. Your account will be immediately deleted, all active sessions will be terminated, and all data will be removed from our servers.
              </p>
            </div>

            {/* What is deleted breakdown */}
            <div className="bg-[#FFE4D8] border border-[#800021] rounded-xl p-4 text-xs text-[#800021] space-y-2">
              <p className="font-bold">What will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#0B0B0B]">
                <li>Your account credentials and authentication identity</li>
                <li>Your master profile, career facts, and normalized timeline</li>
                <li>All resume and CV documents and their customized sections</li>
                <li>All AI telemetry and usage logs</li>
              </ul>
            </div>

            {/* Export First Helper */}
            <div className="flex items-center justify-between text-xs bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-3">
              <span className="text-[#333333]">Want a copy of your records?</span>
              <a
                href="/api/account/export"
                download
                onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
                className="font-semibold text-[#800021] hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#800021] rounded py-1 px-2"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export first</span>
              </a>
            </div>

            {/* Error Message & Re-auth prompt */}
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-lg text-xs font-semibold bg-[#FFE4D8] text-[#800021] border border-[#800021] space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
                {reauthRequired && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSignOutAndReauth}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#800021] text-white text-xs font-semibold hover:bg-[#881144] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
                    >
                      Sign in again to continue
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Email Confirmation Form */}
            {!reauthRequired && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="delete-confirm-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#0B0B0B] mb-1.5"
                  >
                    Type your email to confirm (<span className="normal-case select-all">{user.email}</span>)
                  </label>
                  <input
                    id="delete-confirm-email"
                    ref={confirmInputRef}
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={user.email}
                    disabled={submitting}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={submitting}
                    className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={!isEmailMatched || submitting}
                    aria-busy={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] hover:bg-[#881144] disabled:opacity-40 disabled:cursor-not-allowed text-[#FFFFFF] text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        <span>Deleting Account...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        <span>Permanently Delete My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
