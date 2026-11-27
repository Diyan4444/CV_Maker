'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { safeNextPath } from '@/lib/navigation/safe-redirect';
import { useToast } from '@/components/ui/ToastProvider';
import { FloatCard } from '@/components/ui/FloatCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Emph } from '@/components/ui/Emph';
import { EXPORT_DATA_CATEGORIES } from '@/lib/account/export-schema';
import {
  type AnimationPref,
  type FloatPref,
  type GlassPref,
  type BgLevelPref,
  readStoredAnimationsPref,
  readStoredFloatPref,
  readStoredGlassPref,
  readStoredBgLevelPref,
  setAnimationsPreference,
  setFloatPreference,
  setGlassPreference,
  setBgLevelPreference,
} from '@/lib/preferences/interface';
import { WARM_TOKENS, ON_DARK_TOKENS, GLASS_TOKENS } from '@/styles/tokens';
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

  // Interface preferences
  const [animationsPref, setAnimationsPref] = useState<AnimationPref>('system');
  const [floatPref, setFloatPref] = useState<FloatPref>('normal');
  const [glassPref, setGlassPref] = useState<GlassPref>('auto');
  const [bgLevelPref, setBgLevelPref] = useState<BgLevelPref>('normal');
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
    queueMicrotask(() => {
      setAnimationsPref(readStoredAnimationsPref());
      setFloatPref(readStoredFloatPref());
      setGlassPref(readStoredGlassPref());
      setBgLevelPref(readStoredBgLevelPref());
    });
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

  const handleSelectAnimations = (pref: AnimationPref) => {
    setAnimationsPref(pref);
    setAnimationsPreference(pref);
  };

  const handleSelectFloat = (pref: FloatPref) => {
    setFloatPref(pref);
    setFloatPreference(pref);
  };

  const handleSelectGlass = (pref: GlassPref) => {
    setGlassPref(pref);
    setGlassPreference(pref);
  };

  const handleSelectBgLevel = (pref: BgLevelPref) => {
    setBgLevelPref(pref);
    setBgLevelPreference(pref);
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
          <Emph headingKey="settings" onDark />
        </h1>
        <p
          className="text-xs sm:text-sm mt-1 leading-relaxed max-w-[70ch]"
          style={{ color: ON_DARK_TOKENS.onDarkMuted }}
        >
          Manage your account details, sign-in methods, JSON data archive, and interface preferences.
        </p>
      </div>

      {/* Two-Column Layout: Left Sub-Nav + Right Content Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Sub-Navigation: wrapping list on < 1024px, sticky left column on >= 1024px */}
        <GlassPanel
          as="nav"
          variant="frosted"
          aria-label="Settings sections"
          className="w-full lg:w-56 shrink-0 p-2 lg:sticky lg:top-6"
        >
          <ul className="flex flex-wrap lg:flex-col gap-1.5">
            {SUBNAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={active ? 'location' : undefined}
                    className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
                    style={{
                      backgroundColor: active ? GLASS_TOKENS.tileBgHover : 'transparent',
                      color: active ? GLASS_TOKENS.accentOnGlass : GLASS_TOKENS.fg,
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </GlassPanel>

        {/* Right Content Panel */}
        <div className="flex-1 w-full min-w-0 space-y-7 pt-2">
          {/* 1. ACCOUNT INFORMATION */}
          <FloatCard
            as="section"
            id="account-info"
            floatIndex={1}
            aria-labelledby="section-account-title"
            className="scroll-mt-20"
          >
            <GlassPanel variant="frosted">
              <div className="px-5 sm:px-6 py-4 border-b glass-divider flex items-center gap-2.5">
                <Shield className="w-4 h-4 shrink-0" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
                <h2 id="section-account-title" className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
                  Account information
                </h2>
              </div>

              <div className="divide-y glass-divider">
              {/* Email Row */}
              <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    Email
                  </div>
                  <div className="text-xs sm:text-sm break-all" style={{ color: GLASS_TOKENS.fgMuted }}>
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
                  <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    Account created
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: GLASS_TOKENS.fgMuted }}>
                    {formattedDate}
                  </div>
                </div>
              </div>

              {/* User ID Row with Eye Toggle */}
              <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    User ID
                  </div>
                  {revealedUserId ? (
                    <div
                      data-testid="revealed-user-id"
                      className="font-mono text-xs break-all select-all"
                      style={{ color: GLASS_TOKENS.fg }}
                    >
                      {revealedUserId}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm tracking-wider" style={{ color: GLASS_TOKENS.fgMuted }}>
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
                  className="btn-glass-secondary min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] shrink-0"
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
        </GlassPanel>
      </FloatCard>

      {/* 2. SIGN-IN METHODS */}
      <FloatCard
        as="section"
        id="sign-in-methods"
        floatIndex={2}
        aria-labelledby="section-signin-title"
        className="scroll-mt-20"
      >
        <GlassPanel variant="frosted">
          <div className="px-5 sm:px-6 py-4 border-b glass-divider flex items-center gap-2.5">
            <Mail className="w-4 h-4 shrink-0" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
            <h2 id="section-signin-title" className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
              Sign-in methods
            </h2>
          </div>

          <div className="divide-y glass-divider">
            {user.providers.map((provider) => (
              <div
                key={provider}
                data-testid={`signin-provider-${provider}`}
                className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    {PROVIDER_LABELS[provider] || provider}
                  </div>
                  <div className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                    Linked authentication method
                  </div>
                </div>
                <span
                  className="glass-tile px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ color: GLASS_TOKENS.fg }}
                >
                  Linked
                </span>
              </div>
            ))}
            <div className="px-5 sm:px-6 py-3.5 text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
              The same verified email address opens the same Quillfolio account.
            </div>
          </div>
        </GlassPanel>
      </FloatCard>

          {/* 3. DATA & PORTABILITY */}
          <FloatCard
            as="section"
            id="data-portability"
            floatIndex={3}
            aria-labelledby="section-data-title"
            className="scroll-mt-20"
          >
            <GlassPanel variant="frosted" className="p-5 sm:p-6 space-y-5">
              <div>
                <h2 id="section-data-title" className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
                  Your data, always yours.
                </h2>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: GLASS_TOKENS.fgMuted }}>
                  Download a complete copy of your Quillfolio data.
                </p>
              </div>

              <div className="glass-tile rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold" style={{ color: GLASS_TOKENS.fg }}>
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
                style={{ color: GLASS_TOKENS.fg }}
              >
                {EXPORT_DATA_CATEGORIES.map((cat) => (
                  <li key={cat.key} data-export-key={cat.key} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
                    <span>{cat.label}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
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

              <div className="flex items-center justify-between gap-2 pt-1 text-[11px]" style={{ color: GLASS_TOKENS.fgMuted }}>
                <span>JSON &middot; Machine-readable archive</span>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1 font-semibold hover:underline min-h-[44px]"
                  style={{ color: GLASS_TOKENS.accentOnGlass }}
                >
                  <span>Privacy &amp; Data Rights</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </GlassPanel>
          </FloatCard>

          {/* 4. INTERFACE */}
          <FloatCard
            as="section"
            id="interface"
            floatIndex={4}
            aria-labelledby="section-interface-title"
            className="scroll-mt-20"
          >
            <GlassPanel variant="frosted">
              <div className="px-5 sm:px-6 py-4 border-b glass-divider flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
                <h2 id="section-interface-title" className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
                  Interface
                </h2>
              </div>

              <div className="divide-y glass-divider">
                {/* Animations */}
                <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                      Animations
                    </div>
                    <div className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                      &ldquo;On&rdquo; overrides the OS reduced-motion setting for decorative effects only.
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Animations" className="flex flex-wrap gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'system', label: 'Follow system' },
                        { id: 'on', label: 'On' },
                        { id: 'off', label: 'Off' },
                      ] as const
                    ).map((opt) => {
                      const active = animationsPref === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleSelectAnimations(opt.id)}
                          className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                            active ? '' : 'btn-glass-secondary'
                          }`}
                          style={
                            active
                              ? { backgroundColor: WARM_TOKENS.primary, color: WARM_TOKENS.primaryText }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Float */}
                <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                      Float
                    </div>
                    <div className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                      Vertical motion amplitude on floating cards (0, 8, 14, or 22 px).
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Float" className="flex flex-wrap gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'off', label: 'Off' },
                        { id: 'subtle', label: 'Subtle' },
                        { id: 'normal', label: 'Normal' },
                        { id: 'strong', label: 'Strong' },
                      ] as const
                    ).map((opt) => {
                      const active = floatPref === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleSelectFloat(opt.id)}
                          className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                            active ? '' : 'btn-glass-secondary'
                          }`}
                          style={
                            active
                              ? { backgroundColor: WARM_TOKENS.primary, color: WARM_TOKENS.primaryText }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Glass */}
                <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                      Glass
                    </div>
                    <div className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                      Panel translucency and backdrop blur preset. Auto simplifies on low-power devices.
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Glass" className="flex flex-wrap gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: 'light', label: 'Light' },
                        { id: 'frosted', label: 'Frosted' },
                        { id: 'dense', label: 'Dense' },
                        { id: 'solid', label: 'Solid' },
                      ] as const
                    ).map((opt) => {
                      const active = glassPref === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleSelectGlass(opt.id)}
                          className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                            active ? '' : 'btn-glass-secondary'
                          }`}
                          style={
                            active
                              ? { backgroundColor: WARM_TOKENS.primary, color: WARM_TOKENS.primaryText }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Background */}
                <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold" style={{ color: GLASS_TOKENS.fg }}>
                      Background
                    </div>
                    <div className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                      Contrast of topographic contour lines, ambient pools, and scattered icons.
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Background" className="flex flex-wrap gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'subtle', label: 'Subtle' },
                        { id: 'normal', label: 'Normal' },
                        { id: 'strong', label: 'Strong' },
                      ] as const
                    ).map((opt) => {
                      const active = bgLevelPref === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleSelectBgLevel(opt.id)}
                          className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                            active ? '' : 'btn-glass-secondary'
                          }`}
                          style={
                            active
                              ? { backgroundColor: WARM_TOKENS.primary, color: WARM_TOKENS.primaryText }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassPanel>
          </FloatCard>

          {/* 5. DELETE ACCOUNT */}
          <FloatCard
            as="section"
            id="delete-account"
            floatIndex={5}
            aria-labelledby="section-danger-title"
            className="scroll-mt-20"
          >
            <GlassPanel variant="dense" accentBorder className="p-5 sm:p-6 space-y-4">
              <div className="border-b glass-divider pb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
                <div>
                  <h2 id="section-danger-title" className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    Delete account
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: GLASS_TOKENS.fgMuted }}>
                    Permanent and irreversible account removal.
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
                Permanently delete your account and remove all personal information, master profile facts, documents, and telemetry. Once deleted, this data cannot be recovered.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/api/account/export"
                  download
                  onClick={() => toast.show({ message: 'Export started', variant: 'success' })}
                  className="btn-glass-secondary min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
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
            </GlassPanel>
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
