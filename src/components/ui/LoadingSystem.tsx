'use client';

import React, { useEffect, useState } from 'react';
import { PRODUCT_NAME } from '@/config/app';
import { Loader2, AlertCircle, RefreshCw, Clock } from 'lucide-react';

/* ==========================================================================
   Quillfolio Wordmark with Animated Ink-Line
   ========================================================================== */
export interface QuillfolioWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  staticLine?: boolean;
}

export function QuillfolioWordmark({
  size = 'md',
  className = '',
  staticLine = false,
}: QuillfolioWordmarkProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <span className={`font-serif ${sizeClasses} font-bold tracking-tight text-[#1A1A1A]`}>
        {PRODUCT_NAME}
      </span>
      <div
        className="relative w-full h-[2px] bg-[#D9D9D9] overflow-hidden rounded-full mt-1.5"
        aria-hidden="true"
      >
        <div
          className={`absolute inset-0 bg-[#800021] ${
            staticLine ? 'w-full' : 'animate-ink-line motion-reduce:animate-none'
          }`}
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   Inline Button Spinner
   ========================================================================== */
export interface ButtonSpinnerProps {
  className?: string;
}

export function ButtonSpinner({ className = 'w-4 h-4' }: ButtonSpinnerProps) {
  return (
    <Loader2
      className={`${className} animate-spin motion-reduce:animate-none flex-shrink-0 text-current`}
      aria-hidden="true"
    />
  );
}

/* ==========================================================================
   Slow-Load Notice & Timeout Error Cards
   ========================================================================== */
export interface SlowLoadNoticeProps {
  message?: string;
  className?: string;
}

export function SlowLoadNotice({
  message = 'This is taking longer than usual... Please keep this page open.',
  className = '',
}: SlowLoadNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3 bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg text-xs text-[#333333] flex items-center justify-center gap-2 shadow-xs ${className}`}
    >
      <Clock className="w-4 h-4 text-[#800021] flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export interface TimeoutErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function TimeoutErrorState({
  title = "We couldn't load this in time.",
  description = 'Please check your connection and try again.',
  onRetry,
  className = '',
}: TimeoutErrorStateProps) {
  return (
    <div
      role="alert"
      className={`p-4 bg-[#FFE4D8] border border-[#800021] rounded-lg text-xs text-[#800021] flex flex-col items-center gap-2.5 text-center shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 font-semibold text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#800021]" aria-hidden="true" />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-[#333333]">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry loading"
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

/* ==========================================================================
   Full-Page Loader Component
   ========================================================================== */
export interface QuillfolioPageLoaderProps {
  message?: string;
  onRetry?: () => void;
  simulateSlow?: boolean;
  simulateTimeout?: boolean;
}

export function QuillfolioPageLoader({
  message = 'Loading...',
  onRetry,
  simulateSlow = false,
  simulateTimeout = false,
}: QuillfolioPageLoaderProps) {
  const [isSlow, setIsSlow] = useState(simulateSlow);
  const [isTimedOut, setIsTimedOut] = useState(simulateTimeout);

  useEffect(() => {
    if (simulateSlow) return;
    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 6000);

    return () => clearTimeout(slowTimer);
  }, [simulateSlow]);

  useEffect(() => {
    if (simulateTimeout) return;
    const timeoutTimer = setTimeout(() => {
      setIsTimedOut(true);
    }, 25000);

    return () => clearTimeout(timeoutTimer);
  }, [simulateTimeout]);

  return (
    <div
      role="region"
      aria-label="Loading page"
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-md p-8 max-w-sm w-full text-center space-y-4">
        <QuillfolioWordmark size="lg" />

        <div className="pt-2">
          <p
            role="status"
            aria-live="polite"
            className="font-sans text-xs text-[#333333] font-medium"
          >
            {message}
          </p>
        </div>

        {/* Slow load notice after 6 seconds */}
        {isSlow && !isTimedOut && <SlowLoadNotice />}

        {/* Timeout error state after 25 seconds */}
        {isTimedOut && (
          <TimeoutErrorState
            onRetry={
              onRetry ||
              (() => {
                if (typeof window !== 'undefined') window.location.reload();
              })
            }
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Layout Skeletons (Matching exact final layouts to eliminate layout shift)
   ========================================================================== */

/** Honesty Notifier: displays a 6-second slow-load message and a 25-second timeout error with working retry */
export function HonestyNotifier() {
  const [isSlow, setIsSlow] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => setIsSlow(true), 6000);
    const timeoutTimer = setTimeout(() => setIsTimedOut(true), 25000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
    };
  }, []);

  if (isTimedOut) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-50 bg-[#0B0B0B]/40 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <TimeoutErrorState
          onRetry={() => {
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      </div>
    );
  }

  if (isSlow) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <SlowLoadNotice />
      </div>
    );
  }

  return null;
}

/** Common Skeleton Pulse Block with solid opaque contrast */
export function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-[#E5E7EB] rounded animate-pulse motion-reduce:animate-none ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Settings Skeleton matching SettingsPage layout */
export function SettingsSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading settings"
      className="min-h-screen flex flex-col p-4 sm:p-8"
    >
      <HonestyNotifier />
      {/* AppHeader Skeleton */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-sm px-6 py-3.5 flex items-center justify-between">
          <SkeletonBlock className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-5 w-20 hidden sm:block" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-6">
        {/* Title Header Panel */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-8 shadow-sm space-y-2">
          <SkeletonBlock className="h-7 w-48 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-xs" />
        </div>

        {/* Section 1: Account */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-8 shadow-sm space-y-4">
          <SkeletonBlock className="h-5 w-36 max-w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Section 2: Your Data */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-8 shadow-sm space-y-4">
          <SkeletonBlock className="h-5 w-32 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-md" />
          <SkeletonBlock className="h-10 w-48 max-w-full rounded-lg" />
        </div>

        {/* Section 3: Danger Zone */}
        <div className="bg-[#FFFFFF] border border-[#800021] rounded-xl p-4 sm:p-8 shadow-sm space-y-4">
          <SkeletonBlock className="h-5 w-32 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-sm" />
          <SkeletonBlock className="h-10 w-44 max-w-full rounded-lg" />
        </div>
      </main>

      <div className="max-w-4xl mx-auto w-full mt-6">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-4 shadow-sm flex items-center justify-between">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

/** Dashboard Skeleton matching AppShell + Documents-first Dashboard layout */
export function DashboardSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading dashboard"
      className="min-h-screen flex flex-col md:flex-row"
    >
      <HonestyNotifier />
      {/* Desktop Sidebar Skeleton (>= 768px) */}
      <aside className="hidden md:flex md:flex-col md:justify-between md:sticky md:top-4 md:m-4 md:mr-0 md:h-[calc(100vh-32px)] shrink-0 w-[232px] rounded-2xl border bg-[#FFFDF9] border-[#E7DDD0] p-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 py-2">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
          <SkeletonBlock className="h-11 w-full rounded-lg" />
          <div className="space-y-2 pt-2">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="border-t border-[#E7DDD0] pt-3">
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      </aside>

      {/* Mobile Compact Top Bar Skeleton (< 768px) */}
      <div className="md:hidden sticky top-0 z-30 border-b border-[#E7DDD0] bg-[#FFFDF9] px-3 py-2 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-24" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-11 w-16 rounded-lg" />
          <SkeletonBlock className="h-11 w-11 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="max-w-[1680px] mx-auto w-full p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          <main className="space-y-6">
          {/* Page Header & Search Strip Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-7 w-40" />
                <SkeletonBlock className="h-4 w-56" />
              </div>
              <SkeletonBlock className="h-11 w-36 rounded-lg" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <SkeletonBlock className="h-11 flex-1 rounded-lg" />
              <SkeletonBlock className="h-11 w-40 rounded-lg" />
            </div>
          </div>

          {/* Documents Row List Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl divide-y divide-[#E7DDD0]">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <SkeletonBlock className="h-5 w-48" />
                  <SkeletonBlock className="h-3.5 w-36" />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                  <SkeletonBlock className="h-9 w-9 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Master Profile Summary Strip Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 space-y-3">
            <SkeletonBlock className="h-5 w-44" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <SkeletonBlock key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Profile Skeleton matching AppShell + MasterProfileEditor layout */
export function ProfileSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading profile"
      className="min-h-screen flex flex-col md:flex-row"
    >
      <HonestyNotifier />
      {/* Desktop Sidebar Skeleton (>= 768px) */}
      <aside className="hidden md:flex md:flex-col md:justify-between md:sticky md:top-4 md:m-4 md:mr-0 md:h-[calc(100vh-32px)] shrink-0 w-[232px] rounded-2xl border bg-[#FFFDF9] border-[#E7DDD0] p-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 py-2">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
          <SkeletonBlock className="h-11 w-full rounded-lg" />
          <div className="space-y-2 pt-2">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="border-t border-[#E7DDD0] pt-3">
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      </aside>

      {/* Mobile Compact Top Bar Skeleton (< 768px) */}
      <div className="md:hidden sticky top-0 z-30 border-b border-[#E7DDD0] bg-[#FFFDF9] px-3 py-2 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-24" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-11 w-16 rounded-lg" />
          <SkeletonBlock className="h-11 w-11 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="max-w-[1680px] mx-auto w-full p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          <main className="w-full space-y-6">
          {/* Page Title & Instructions Panel Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-6 sm:p-8 space-y-2">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-4 w-full max-w-xl" />
          </div>

          {/* Top Save Bar Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-96 max-w-full" />
              <SkeletonBlock className="h-3 w-36" />
            </div>
            <SkeletonBlock className="h-10 w-36 rounded-lg" />
          </div>

          {/* Section 1: Basic Identity Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Section 1.5: Professional Summary Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3.5 w-3/4" />
            </div>
          </div>

          {/* Section 2: Education Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <SkeletonBlock className="h-4 w-44" />
                    <SkeletonBlock className="h-4 w-28" />
                  </div>
                  <SkeletonBlock className="h-3.5 w-64" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Experience Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <SkeletonBlock className="h-4 w-44" />
                    <SkeletonBlock className="h-4 w-28" />
                  </div>
                  <SkeletonBlock className="h-3.5 w-64" />
                  <SkeletonBlock className="h-12 w-full rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Projects Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-4 space-y-2.5">
                  <SkeletonBlock className="h-4 w-52" />
                  <SkeletonBlock className="h-3.5 w-72" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Skills Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-3 space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3.5 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Publications Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-4 space-y-2">
                  <SkeletonBlock className="h-4 w-60" />
                  <SkeletonBlock className="h-3.5 w-40" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Certifications & Honors Skeleton */}
          <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-[#E7DDD0] pb-3 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-52" />
              <SkeletonBlock className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border border-[#E7DDD0] rounded-lg p-4 space-y-2">
                  <SkeletonBlock className="h-4 w-48" />
                  <SkeletonBlock className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Editor Skeleton matching DocumentEditor 2-column layout */
export function EditorSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading document editor"
      className="min-h-screen flex flex-col bg-[#F7F7F8]"
    >
      <HonestyNotifier />
      {/* Top Toolbar Skeleton */}
      <div className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#6B6B6B] px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <SkeletonBlock className="h-5 w-36 sm:w-48" />
              <SkeletonBlock className="h-3 w-24 sm:hidden" />
            </div>
          </div>

          {/* Toolbar Controls (Template, Undo/Redo, Status, Buttons) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-11 sm:h-8 w-36 rounded-md flex-shrink-0" />
              <SkeletonBlock className="h-11 sm:h-8 w-16 rounded-md flex-shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-start">
              <SkeletonBlock className="h-11 sm:h-8 w-36 rounded-md" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
              <SkeletonBlock className="h-11 sm:h-8 w-20 rounded-md" />
              <SkeletonBlock className="h-11 sm:h-8 w-32 rounded-md" />
            </div>
          </div>
        </div>

        {/* Mobile View Tab Switcher (<768px) */}
        <div className="md:hidden flex border-t border-[#6B6B6B] mt-2.5 pt-2">
          <div className="flex-1 min-h-[44px] flex items-center justify-center">
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="flex-1 min-h-[44px] flex items-center justify-center">
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="flex-1 min-h-[44px] flex items-center justify-center">
            <SkeletonBlock className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* Editor Body: Left Cards + Right A4 Placeholder */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Sections Skeleton */}
        <div className="w-full lg:w-[48%] space-y-4">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-serif text-sm font-bold text-[#1A1A1A]">
                Loading your document...
              </span>
              <p className="text-[11px] text-[#6B6B6B]">
                Populating document structure and verified profile facts...
              </p>
            </div>
            <ButtonSpinner className="w-4 h-4 text-[#800021]" />
          </div>

          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-36" />
                <div className="flex gap-1.5">
                  <SkeletonBlock className="h-6 w-6 rounded" />
                  <SkeletonBlock className="h-6 w-6 rounded" />
                </div>
              </div>
              <SkeletonBlock className="h-9 w-full rounded-md" />
              <SkeletonBlock className="h-16 w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* Right Column: Live A4 Preview Placeholder */}
        <div className="hidden md:block w-full lg:w-[52%]">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm flex flex-col h-full min-h-[600px]">
            <div className="bg-[#FFFFFF] border-b border-[#6B6B6B] px-4 py-2.5 flex items-center justify-between">
              <span className="font-semibold text-xs text-[#0B0B0B]">Live A4 Preview</span>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-6 w-14 rounded" />
                <SkeletonBlock className="h-6 w-14 rounded" />
              </div>
            </div>

            <div className="flex-1 bg-[#F1F7F7] p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-[480px] aspect-[1/1.4142] bg-[#FFFFFF] border border-[#6B6B6B] rounded shadow-md p-8 flex flex-col items-center justify-center space-y-4 text-center">
                <QuillfolioWordmark size="md" />
                <p className="font-sans text-xs text-[#333333] font-medium" role="status">
                  Preparing preview...
                </p>
                <div className="w-3/4 space-y-2 pt-4" aria-hidden="true">
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-3 w-5/6 mx-auto" />
                  <SkeletonBlock className="h-3 w-2/3 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Onboarding Skeleton matching Phase 8C OnboardingPage layout */
export function OnboardingSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading onboarding"
      className="min-h-screen flex flex-col pb-28"
    >
      <HonestyNotifier />
      {/* Header Skeleton */}
      <div className="max-w-4xl mx-auto w-full pt-4 sm:pt-8 px-4 sm:px-8 mb-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl px-5 sm:px-6 py-4 shadow-sm flex items-center justify-between">
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
      </div>

      <main className="max-w-2xl w-full mx-auto px-4 sm:px-0 flex-1 space-y-6 relative z-10">
        {/* Hero & 2 Specimen Cards */}
        <div className="space-y-4">
          <div className="space-y-2 px-1">
            <SkeletonBlock className="h-8 w-64" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-4 space-y-3">
                <SkeletonBlock className="h-56 w-full rounded-lg" />
                <SkeletonBlock className="h-3 w-36" />
                <SkeletonBlock className="h-5 w-28" />
                <SkeletonBlock className="h-3.5 w-48" />
              </div>
            ))}
          </div>
        </div>

        {/* 01 Your background */}
        <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-6 w-44" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
        </div>

        {/* 02 Where are you right now? */}
        <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-11 w-full rounded-lg" />
        </div>

        {/* 03 What are you working toward? */}
        <div className="bg-[#FFFDF9] border border-[#E7DDD0] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-6 w-52" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonBlock key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
