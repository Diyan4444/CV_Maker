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

/** Dashboard Skeleton matching DashboardPage layout */
export function DashboardSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading dashboard"
      className="min-h-screen flex flex-col p-4 sm:p-8"
    >
      <HonestyNotifier />
      {/* AppHeader Skeleton */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3.5 shadow-sm flex items-center justify-between">
          <SkeletonBlock className="h-7 w-32" />
          <div className="hidden sm:flex items-center gap-4">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full space-y-6">
        {/* Welcome & Status Bar Panel Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-10 w-36 rounded-lg" />
        </div>

        {/* Overview Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-7 w-7 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-12" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-7 w-7 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-12" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-7 w-7 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-20" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
        </div>

        {/* Documents Section Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#6B6B6B] pb-4">
            <div className="space-y-1">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-60" />
            </div>
            <SkeletonBlock className="h-9 w-36 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBlock className="h-5 w-48" />
                    <SkeletonBlock className="h-3.5 w-32" />
                  </div>
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
                <div className="pt-2 border-t border-[#D9D9D9] flex items-center justify-between">
                  <SkeletonBlock className="h-3.5 w-24" />
                  <div className="flex gap-2">
                    <SkeletonBlock className="h-8 w-16 rounded-md" />
                    <SkeletonBlock className="h-8 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Profile Skeleton matching MasterProfileEditor layout */
export function ProfileSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading profile"
      className="min-h-screen flex flex-col p-4 sm:p-8"
    >
      <HonestyNotifier />
      {/* AppHeader Skeleton */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3.5 shadow-sm flex items-center justify-between">
          <SkeletonBlock className="h-7 w-32" />
          <div className="hidden sm:flex items-center gap-4">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full space-y-6">
        {/* Top Save Bar Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-4 w-96 max-w-full" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
          <SkeletonBlock className="h-10 w-36 rounded-lg" />
        </div>

        {/* Section 1: Basic Identity Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-[#D9D9D9] pb-3 flex items-center justify-between">
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

        {/* Section 2: Experience Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-[#D9D9D9] pb-3 flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-8 w-28 rounded-md" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border border-[#D9D9D9] rounded-lg p-4 space-y-2.5">
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
      </main>
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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="h-6 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-8 w-28 rounded-md" />
            <SkeletonBlock className="h-8 w-20 rounded-md" />
            <SkeletonBlock className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </div>

      {/* Editor Body: Left Cards + Right A4 Placeholder */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col lg:flex-row gap-6">
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
        <div className="w-full lg:w-[52%]">
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
      </div>
    </div>
  );
}

/** Onboarding Skeleton matching OnboardingPage layout */
export function OnboardingSkeleton() {
  return (
    <div
      role="region"
      aria-label="Loading onboarding"
      className="min-h-screen flex flex-col p-4 sm:p-8"
    >
      <HonestyNotifier />
      <main className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-4 shadow-sm flex items-center justify-between">
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="h-5 w-24" />
        </div>

        {/* Stepper Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-sm flex justify-between gap-2">
          <SkeletonBlock className="h-8 flex-1 rounded-md" />
          <SkeletonBlock className="h-8 flex-1 rounded-md" />
          <SkeletonBlock className="h-8 flex-1 rounded-md" />
        </div>

        {/* Form Card Skeleton */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-56" />
            <SkeletonBlock className="h-4 w-80" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-[#D9D9D9] rounded-lg p-4 space-y-2">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="h-3.5 w-48" />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-[#D9D9D9]">
            <SkeletonBlock className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
