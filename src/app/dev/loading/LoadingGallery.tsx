'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  QuillfolioWordmark,
  ButtonSpinner,
  SlowLoadNotice,
  TimeoutErrorState,
  QuillfolioPageLoader,
  DashboardSkeleton,
  ProfileSkeleton,
  EditorSkeleton,
  OnboardingSkeleton,
  SkeletonBlock,
} from '@/components/ui/LoadingSystem';
import { ArrowLeft, RefreshCw, Save, Download, Copy, Trash2 } from 'lucide-react';

type TabId =
  | 'overview'
  | 'fullpage'
  | 'dashboard-skeleton'
  | 'profile-skeleton'
  | 'editor-skeleton'
  | 'onboarding-skeleton'
  | 'editor-stages'
  | 'buttons'
  | 'slow-error';

export function LoadingGallery() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [retryCount, setRetryCount] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);

  const simulateButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-[#6B6B6B] text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] transition-colors"
              title="Return home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold text-[#1A1A1A]">
                  Loading States &amp; Skeletons Gallery
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFE4D8] text-[#800021] border border-[#800021]">
                  Dev Only
                </span>
              </div>
              <p className="text-xs text-[#333333] mt-0.5">
                Quillfolio brand-aligned loaders, layout-preserving skeletons, ink-lines, and honesty states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-xs font-semibold text-[#0B0B0B] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset State ({retryCount})
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'All Loaders Overview' },
            { id: 'fullpage', label: 'Full-Page Loader' },
            { id: 'dashboard-skeleton', label: 'Dashboard Skeleton' },
            { id: 'profile-skeleton', label: 'Profile Skeleton' },
            { id: 'editor-skeleton', label: 'Editor Skeleton' },
            { id: 'onboarding-skeleton', label: 'Onboarding Skeleton' },
            { id: 'editor-stages', label: 'Editor Stages' },
            { id: 'buttons', label: 'Async Action Buttons' },
            { id: 'slow-error', label: 'Slow & Error States' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                activeTab === tab.id
                  ? 'bg-[#800021] text-white border-[#800021]'
                  : 'bg-[#FFFFFF] text-[#333333] border-[#6B6B6B] hover:bg-[#F1F7F7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 1. Wordmark & Ink-Line Showcase */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] border-b border-[#D9D9D9] pb-2">
                1. Product Wordmark with Animated Ink-Line
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
                <div className="p-4 border border-[#D9D9D9] rounded-lg bg-[#F7F7F8]">
                  <span className="text-[11px] text-[#6B6B6B] block mb-2 font-mono">Size: sm</span>
                  <QuillfolioWordmark size="sm" />
                </div>
                <div className="p-4 border border-[#D9D9D9] rounded-lg bg-[#F7F7F8]">
                  <span className="text-[11px] text-[#6B6B6B] block mb-2 font-mono">Size: md (default)</span>
                  <QuillfolioWordmark size="md" />
                </div>
                <div className="p-4 border border-[#D9D9D9] rounded-lg bg-[#F7F7F8]">
                  <span className="text-[11px] text-[#6B6B6B] block mb-2 font-mono">Size: lg</span>
                  <QuillfolioWordmark size="lg" />
                </div>
              </div>
              <div className="text-xs text-[#333333]">
                Respects <code className="bg-[#F1F7F7] px-1 py-0.5 rounded text-[#800021]">prefers-reduced-motion</code>: under reduced motion, the ink stroke displays as a static solid burgundy line without animation.
              </div>
            </div>

            {/* 2. Slow Load & Timeout Error */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] border-b border-[#D9D9D9] pb-2">
                2. Slow-Load Honesty &amp; Timeout Retry States
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#1A1A1A]">
                    Slow-Load Notice (Triggered after 6 seconds):
                  </span>
                  <SlowLoadNotice />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#1A1A1A]">
                    Timeout Error State (Triggered after 25 seconds):
                  </span>
                  <TimeoutErrorState onRetry={() => alert('Retry triggered successfully.')} />
                </div>
              </div>
            </div>

            {/* 3. Editor Stages Preview */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] border-b border-[#D9D9D9] pb-2">
                3. Three Key Editor Stages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#6B6B6B] rounded-lg p-4 bg-[#FFFFFF] text-center space-y-3">
                  <span className="text-[10px] font-bold text-[#800021] uppercase tracking-wider block">Stage 1</span>
                  <div className="p-3 bg-[#F7F7F8] rounded-md space-y-2">
                    <span className="font-serif text-xs font-bold text-[#1A1A1A] block">Loading your document...</span>
                    <SkeletonBlock className="h-3 w-3/4 mx-auto" />
                    <SkeletonBlock className="h-3 w-1/2 mx-auto" />
                  </div>
                </div>

                <div className="border border-[#6B6B6B] rounded-lg p-4 bg-[#FFFFFF] text-center space-y-3">
                  <span className="text-[10px] font-bold text-[#800021] uppercase tracking-wider block">Stage 2</span>
                  <div className="p-3 bg-[#F1F7F7] rounded-md space-y-2 border border-[#BDD7D8]">
                    <QuillfolioWordmark size="sm" />
                    <span className="text-xs font-medium text-[#333333] block">Preparing preview...</span>
                    <SkeletonBlock className="h-2 w-3/4 mx-auto" />
                  </div>
                </div>

                <div className="border border-[#6B6B6B] rounded-lg p-4 bg-[#FFFFFF] text-center space-y-3">
                  <span className="text-[10px] font-bold text-[#800021] uppercase tracking-wider block">Stage 3</span>
                  <div className="p-3 bg-[#FFFFFF] border border-[#6B6B6B] rounded-md space-y-2">
                    <div className="w-6 h-6 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center mx-auto text-[#800021]">
                      <ButtonSpinner className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-serif text-xs font-bold text-[#1A1A1A] block">Running checks...</span>
                    <span className="text-[11px] text-[#333333] block">Analyzing PDF text stream...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fullpage' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F7F7] p-3 border-b border-[#6B6B6B] text-xs font-semibold text-[#163832]">
              Full-Page Loading Screen Preview (`QuillfolioPageLoader`)
            </div>
            <div className="p-4 bg-[#F7F7F8]">
              <QuillfolioPageLoader message="Loading your document..." simulateSlow={true} />
            </div>
          </div>
        )}

        {activeTab === 'dashboard-skeleton' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F7F7] p-3 border-b border-[#6B6B6B] text-xs font-semibold text-[#163832]">
              Dashboard Skeleton Layout (`/dashboard/loading.tsx`)
            </div>
            <div className="p-2 sm:p-4 bg-[#F7F7F8]">
              <DashboardSkeleton />
            </div>
          </div>
        )}

        {activeTab === 'profile-skeleton' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F7F7] p-3 border-b border-[#6B6B6B] text-xs font-semibold text-[#163832]">
              Profile Skeleton Layout (`/profile/loading.tsx`)
            </div>
            <div className="p-2 sm:p-4 bg-[#F7F7F8]">
              <ProfileSkeleton />
            </div>
          </div>
        )}

        {activeTab === 'editor-skeleton' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F7F7] p-3 border-b border-[#6B6B6B] text-xs font-semibold text-[#163832]">
              Editor Skeleton Layout (`/editor/[documentId]/loading.tsx`)
            </div>
            <div className="p-2 sm:p-4 bg-[#F7F7F8]">
              <EditorSkeleton />
            </div>
          </div>
        )}

        {activeTab === 'onboarding-skeleton' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F7F7] p-3 border-b border-[#6B6B6B] text-xs font-semibold text-[#163832]">
              Onboarding Skeleton Layout (`/onboarding/loading.tsx`)
            </div>
            <div className="p-2 sm:p-4 bg-[#F7F7F8]">
              <OnboardingSkeleton />
            </div>
          </div>
        )}

        {activeTab === 'editor-stages' && (
          <div className="space-y-6">
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Stage 1: Left Cards Loading
              </h3>
              <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-xs flex items-center justify-between max-w-md">
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
            </div>

            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Stage 2: Live Preview Preparing
              </h3>
              <div className="bg-[#F1F7F7] p-6 rounded-xl flex justify-center">
                <div className="w-full max-w-[440px] aspect-[1/1.4142] bg-[#FFFFFF] border border-[#6B6B6B] rounded shadow-md p-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <QuillfolioWordmark size="sm" />
                  <p className="font-sans text-xs text-[#333333] font-medium" role="status">
                    Preparing preview...
                  </p>
                  <div className="w-3/4 space-y-2 pt-2" aria-hidden="true">
                    <SkeletonBlock className="h-3 w-full" />
                    <SkeletonBlock className="h-3 w-5/6 mx-auto" />
                    <SkeletonBlock className="h-3 w-2/3 mx-auto" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Stage 3: ATS Readiness Running Checks
              </h3>
              <div
                role="status"
                aria-label="Running ATS checks"
                className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 text-center shadow-xs space-y-3 max-w-md"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center mx-auto text-[#800021]">
                  <ButtonSpinner className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-sm font-bold text-[#1A1A1A]">Running checks...</p>
                  <p className="text-xs text-[#333333]">Analyzing PDF text stream and layout structure...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buttons' && (
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-lg font-bold text-[#1A1A1A] border-b border-[#D9D9D9] pb-2">
              Async Action Button States
            </h2>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={simulateButtonClick}
                className="px-3 py-1.5 rounded-md bg-[#800021] text-white text-xs font-semibold hover:bg-[#881144] transition-colors"
              >
                Simulate In-Flight (2s)
              </button>
              <span className="text-xs text-[#6B6B6B]">
                Current state: {buttonLoading ? 'In flight (busy)' : 'Idle'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Save Button</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#800021] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Download PDF</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5 text-[#800021]" />
                      <span>Preparing PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Duplicate Document</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#6B6B6B] bg-[#FFFFFF] text-[#333333] text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5 text-[#800021]" />
                      <span>Duplicating...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Delete Document</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#800021] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Save Profile Facts</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#800021] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All Facts</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 border border-[#D9D9D9] rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-[#6B6B6B] block">Keep My Version</span>
                <button
                  type="button"
                  disabled={buttonLoading}
                  aria-busy={buttonLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#800021] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {buttonLoading ? (
                    <>
                      <ButtonSpinner className="w-3.5 h-3.5" />
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

        {activeTab === 'slow-error' && (
          <div className="space-y-6">
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Slow-Load Notice (Polite Announcement)
              </h3>
              <p className="text-xs text-[#333333]">
                Appears automatically after 6 seconds of in-flight activity to inform the user that work is progressing.
              </p>
              <SlowLoadNotice message="This is taking longer than usual... Please keep this page open." />
            </div>

            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Timeout Error State with Retry
              </h3>
              <p className="text-xs text-[#333333]">
                Appears after 25 seconds of in-flight activity if the network or server fails to respond.
              </p>
              <TimeoutErrorState
                title="We couldn't load this in time."
                description="Please check your connection and try again."
                onRetry={() => alert('Retry clicked successfully!')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
