'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { safeNextPath } from '@/lib/navigation/safe-redirect';
import { useToast } from '@/components/ui/ToastProvider';
import { FloatCard } from '@/components/ui/FloatCard';
import { EXPORT_DATA_CATEGORIES } from '@/lib/account/export-schema';
import {
  applyMotionPreference,
  getInitialMotionEnabled,
} from '@/components/ui/MotionInitializer';
import { WARM_TOKENS, ON_DARK_TOKENS } from '@/styles/tokens';
import {
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  CheckCircle2,
  Mail,
  Sparkles,
} from 'lucide-react';

interface SettingsClientProps {
  user: {
    email: string;
    emailVerified: boolean;
    createdAt?: string;
    providers: string[];
  };
}

const SUBNAV_ITEMS = [
  { id: 'account-info', label: 'Account information' },
  { id: 'sign-in-methods', label: 'Sign-in methods' },
  { id: 'data-portability', label: 'Data & portability' },
  { id: 'interface', label: 'Interface' },
  { id: 'delete-account', label: 'Delete account' },
] as const;

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email link',
  google: 'Google',
};

const MASKED_UUID_BULLETS = '\u2022'.repeat(36);

export function SettingsClient({ user }: SettingsClientProps) {
  const toast = useToast();

  // User ID eye toggle (strictly hidden on load, UUID fetched only on reveal)
  const [revealedUserId, setRevealedUserId] = useState<string | null>(null);
  const [loadingUserId, setLoadingUserId] = useState(false);

  // Interface Animations toggle
  const [animationsOn, setAnimationsOn] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('account-info');

  // Delete account modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setAnimationsOn(getInitialMotionEnabled()));
  }, []);

  const handleToggleUserId = async () => {
    if (revealedUserId) {
      setRevealedUserId(null);
      return;
    }
    if (loadingUserId) return;
    setLoadingUserId(true);
    try {
      const res = await fetch('/api/account/me', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && typeof data.id === 'string') {
        setRevealedUserId(data.id);
      } else {
        toast.show({ message: 'Could not load user ID', variant: 'error' });
      }
    } catch {
      toast.show({ message: 'Could not load user ID', variant: 'error' });
    } finally {
      setLoadingUserId(false);
    }
  };

  const handleToggleAnimations = () => {
    const next = !animationsOn;
    setAnimationsOn(next);
    applyMotionPreference(next);
  };

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

  useEffect(() => {
    if (!deleteDialogOpen) return;

    const timer = setTimeout(() => {
      confirmInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDeleteModal();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteDialogOpen, closeDeleteModal]);

  const isEmailMatched = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  const handleDeleteAccount = async () => {
    if (!isEmailMatched || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.code === 'REAUTH_REQUIRED') {
          setReauthRequired(true);
          setErrorMsg(
            'For your security, account deletion requires a recent sign-in. Please sign in again to continue.'
          );
          setSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }
        setErrorMsg(data.error || 'Failed to delete account. Please try again.');
        setSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('quillfolio_') || key.startsWith('cv_maker_') || key.includes('draft'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (storageErr) {
        console.warn('Failed to clear localStorage keys on account deletion:', storageErr);
      }

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/goodbye';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error occurred. Please try again.';
      setErrorMsg(message);
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
      {/* Page Title */}
      <div className="px-1">
        <h1
          className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: ON_DARK_TOKENS.onDarkInk }}
        >
          Account &amp; Settings
        </h1>
        <p
          className="text-xs sm:text-sm mt-1 leading-relaxed max-w-[70ch]"
          style={{ color: ON_DARK_TOKENS.onDarkMuted }}
        >
          Manage your account details, sign-in methods, JSON data archive, and interface preferences.
        </p>
      </div>

      {/* Two-Column Layout: Left Sub-Nav + Right Content Panel */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Sub-Navigation: wrapping list on < 768px, sticky left column on >= 768px */}
        <nav
          aria-label="Settings sections"
          className="w-full md:w-56 shrink-0 rounded-xl border p-2 shadow-sm md:sticky md:top-6"
          style={{
            backgroundColor: WARM_TOKENS.surface,
            borderColor: WARM_TOKENS.borderSubtle,
          }}
        >
          <ul className="flex flex-wrap md:flex-col gap-1.5">
            {SUBNAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={active ? 'location' : undefined}
                    className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
                    style={{
                      backgroundColor: active ? WARM_TOKENS.accentSoft : 'transparent',
                      color: active ? WARM_TOKENS.accentStrong : WARM_TOKENS.ink,
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Content Panel */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {/* 1. ACCOUNT INFORMATION */}
          <FloatCard
            as="section"
            id="account-info"
            floatIndex={1}
            aria-labelledby="section-account-title"
            className="rounded-xl border shadow-sm overflow-hidden scroll-mt-20"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div
              className="px-5 sm:px-6 py-4 border-b flex items-center gap-2.5"
              style={{ borderColor: WARM_TOKENS.borderSubtle }}
            >
              <Shield className="w-4 h-4 shrink-0" style={{ color: WARM_TOKENS.accentStrong }} aria-hidden="true" />
              <h2 id="section-account-title" className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
                Account information
              </h2>
            </div>

            <div className="divide-y" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
              {/* Email Row */}
              <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                    Email
                  </div>
                  <div className="text-xs sm:text-sm break-all" style={{ color: WARM_TOKENS.muted }}>
                    {user.email}
                  </div>
                </div>
                {user.emailVerified && (
                  <span
                    data-testid="email-verified-pill"
                    className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{
                      backgroundColor: WARM_TOKENS.readyBg,
                      color: WARM_TOKENS.readyText,
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Verified
                  </span>
                )}
              </div>

              {/* Account Created Row */}
              <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                    Account created
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: WARM_TOKENS.muted }}>
                    {formattedDate}
                  </div>
                </div>
              </div>

              {/* User ID Row with Eye Toggle */}
              <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                    User ID
                  </div>
                  {revealedUserId ? (
                    <div
                      data-testid="revealed-user-id"
                      className="font-mono text-xs break-all select-all"
                      style={{ color: WARM_TOKENS.ink }}
                    >
                      {revealedUserId}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm tracking-wider" style={{ color: WARM_TOKENS.muted }}>
                      <span aria-hidden="true">{MASKED_UUID_BULLETS}</span>
                      <span className="sr-only">User ID hidden</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleUserId}
                  disabled={loadingUserId}
                  aria-pressed={Boolean(revealedUserId)}
                  aria-label={revealedUserId ? 'Hide user ID' : 'Show user ID'}
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg border transition-colors hover:bg-[#F8F4ED] focus:outline-none focus:ring-2 focus:ring-[#800021] shrink-0"
                  style={{
                    backgroundColor: WARM_TOKENS.surface,
                    borderColor: WARM_TOKENS.borderDefault,
                    color: WARM_TOKENS.ink,
                  }}
                >
                  {loadingUserId ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : revealedUserId ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </FloatCard>

          {/* 2. SIGN-IN METHODS */}
          <FloatCard
            as="section"
            id="sign-in-methods"
            floatIndex={2}
            aria-labelledby="section-signin-title"
            className="rounded-xl border shadow-sm overflow-hidden scroll-mt-20"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div
              className="px-5 sm:px-6 py-4 border-b flex items-center gap-2.5"
              style={{ borderColor: WARM_TOKENS.borderSubtle }}
            >
              <Mail className="w-4 h-4 shrink-0" style={{ color: WARM_TOKENS.accentStrong }} aria-hidden="true" />
              <h2 id="section-signin-title" className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
                Sign-in methods
              </h2>
            </div>

            <div className="divide-y" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
              {user.providers.map((provider) => (
                <div
                  key={provider}
                  data-testid={`signin-provider-${provider}`}
                  className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                      {PROVIDER_LABELS[provider] || provider}
                    </div>
                    <div className="text-xs" style={{ color: WARM_TOKENS.muted }}>
                      Linked authentication method
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: WARM_TOKENS.surface2,
                      color: WARM_TOKENS.ink,
                    }}
                  >
                    Linked
                  </span>
                </div>
              ))}
              <div className="px-5 sm:px-6 py-3.5 text-xs" style={{ color: WARM_TOKENS.muted }}>
                The same verified email address opens the same Quillfolio account.
              </div>
            </div>
          </FloatCard>

          {/* 3. DATA & PORTABILITY */}
          <FloatCard
            as="section"
            id="data-portability"
            floatIndex={3}
            aria-labelledby="section-data-title"
            className="rounded-xl border p-5 sm:p-6 shadow-sm space-y-5 scroll-mt-20"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div>
              <h2 id="section-data-title" className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
                Your data, always yours.
              </h2>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: WARM_TOKENS.muted }}>
                Download a complete copy of your Quillfolio data.
              </p>
            </div>

            <div
              className="rounded-xl border p-4 sm:p-5 space-y-4"
              style={{
                backgroundColor: WARM_TOKENS.surface1,
                borderColor: WARM_TOKENS.borderSubtle,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold" style={{ color: WARM_TOKENS.ink }}>
                  Complete JSON archive
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: WARM_TOKENS.readyBg,
                    color: WARM_TOKENS.readyText,
                  }}
                >
                  Available
                </span>
              </div>

              <ul
                data-testid="export-categories-list"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs"
                style={{ color: WARM_TOKENS.ink }}
              >
                {EXPORT_DATA_CATEGORIES.map((cat) => (
                  <li key={cat.key} data-export-key={cat.key} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: WARM_TOKENS.readyText }} aria-hidden="true" />
                    <span>{cat.label}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs leading-relaxed" style={{ color: WARM_TOKENS.muted }}>
                Generated on demand directly from your database records; no archive copy is stored on the server.
              </p>

              <a
                href="/api/account/export"
                download
                onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
                className="w-full min-h-[44px] px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
                style={{
                  backgroundColor: WARM_TOKENS.primary,
                  color: WARM_TOKENS.primaryText,
                }}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download my data</span>
              </a>

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px]" style={{ color: WARM_TOKENS.muted }}>
                <span>JSON &middot; Machine-readable archive</span>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1 font-semibold hover:underline min-h-[44px]"
                  style={{ color: WARM_TOKENS.accentStrong }}
                >
                  <span>Privacy &amp; Data Rights</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </FloatCard>

          {/* 4. INTERFACE */}
          <FloatCard
            as="section"
            id="interface"
            floatIndex={4}
            aria-labelledby="section-interface-title"
            className="rounded-xl border shadow-sm overflow-hidden scroll-mt-20"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div
              className="px-5 sm:px-6 py-4 border-b flex items-center gap-2.5"
              style={{ borderColor: WARM_TOKENS.borderSubtle }}
            >
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: WARM_TOKENS.accentStrong }} aria-hidden="true" />
              <h2 id="section-interface-title" className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
                Interface
              </h2>
            </div>

            <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                  Animations
                </div>
                <div className="text-xs" style={{ color: WARM_TOKENS.muted }}>
                  Controls floating cards, cursor-reactive background effects, and overscroll behavior.
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={animationsOn}
                aria-label="Animations"
                onClick={handleToggleAnimations}
                className="min-w-[84px] min-h-[44px] px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] shrink-0"
                style={{
                  backgroundColor: animationsOn ? WARM_TOKENS.primary : WARM_TOKENS.surface2,
                  color: animationsOn ? WARM_TOKENS.primaryText : WARM_TOKENS.ink,
                  borderColor: animationsOn ? WARM_TOKENS.primary : WARM_TOKENS.borderDefault,
                }}
              >
                <span>{animationsOn ? 'On' : 'Off'}</span>
              </button>
            </div>
          </FloatCard>

          {/* 5. DELETE ACCOUNT */}
          <FloatCard
            as="section"
            id="delete-account"
            floatIndex={5}
            aria-labelledby="section-danger-title"
            className="rounded-xl border-2 p-5 sm:p-6 shadow-sm space-y-4 scroll-mt-20"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.primary,
            }}
          >
            <div
              className="border-b pb-3 flex items-center gap-2"
              style={{ borderColor: WARM_TOKENS.accentSoft }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: WARM_TOKENS.primary }} aria-hidden="true" />
              <div>
                <h2 id="section-danger-title" className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.primary }}>
                  Delete account
                </h2>
                <p className="text-xs mt-0.5" style={{ color: WARM_TOKENS.muted }}>
                  Permanent and irreversible account removal.
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: WARM_TOKENS.muted }}>
              Permanently delete your account and remove all personal information, master profile facts, documents, and telemetry. Once deleted, this data cannot be recovered.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/account/export"
                download
                onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
                className="min-h-[44px] px-4 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#F8F4ED] focus:outline-none focus:ring-2 focus:ring-[#800021]"
                style={{
                  backgroundColor: WARM_TOKENS.surface,
                  borderColor: WARM_TOKENS.borderDefault,
                  color: WARM_TOKENS.ink,
                }}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export data first</span>
              </a>

              <button
                type="button"
                onClick={openDeleteModal}
                className="min-h-[44px] px-5 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
                style={{
                  backgroundColor: WARM_TOKENS.primary,
                  color: WARM_TOKENS.primaryText,
                }}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Delete Account</span>
              </button>
            </div>
          </FloatCard>
        </div>
      </div>

      {/* ACCESSIBLE ALERTDIALOG MODAL (never wrapped in FloatCard) */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="bg-[#FFFDF9] border-2 border-[#800021] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative text-[#24221F]"
          >
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={submitting}
              className="absolute right-4 top-4 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#706A63] hover:text-[#24221F] hover:bg-[#F8F4ED] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
              aria-label="Close dialog without deleting"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="space-y-2 pr-8">
              <div className="w-10 h-10 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center text-[#800021]">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 id="delete-dialog-title" className="font-display text-xl font-bold text-[#800021]">
                Delete Account &amp; All Data
              </h3>
              <p id="delete-dialog-desc" className="text-xs text-[#706A63] leading-relaxed">
                This action is <strong className="text-[#24221F]">permanent and irreversible</strong>. Your account will be immediately deleted, all active sessions will be terminated, and all data will be removed from our servers.
              </p>
            </div>

            <div className="bg-[#FFE4D8] border border-[#800021] rounded-xl p-4 text-xs text-[#800021] space-y-2">
              <p className="font-bold">What will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#24221F]">
                <li>Your account credentials and authentication identity</li>
                <li>Your master profile, career facts, and normalized timeline</li>
                <li>All resume and CV documents and their customized sections</li>
                <li>All AI telemetry and usage logs</li>
              </ul>
            </div>

            <div className="flex items-center justify-between text-xs bg-[#FCF9F4] border border-[#6B6B6B] rounded-lg p-3">
              <span className="text-[#706A63]">Want a copy of your records?</span>
              <a
                href="/api/account/export"
                download
                onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
                className="font-semibold text-[#800021] hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#800021] rounded py-1 px-2 min-h-[44px]"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export first</span>
              </a>
            </div>

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

            {!reauthRequired && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="delete-confirm-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#24221F] mb-1.5"
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
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] text-[#24221F] text-xs placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={submitting}
                    className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-lg border border-[#6B6B6B] bg-[#FFFDF9] hover:bg-[#F8F4ED] text-[#24221F] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
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
