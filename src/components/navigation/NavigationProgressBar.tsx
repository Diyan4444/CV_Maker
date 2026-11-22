'use client';

/**
 * NavigationProgressBar.tsx
 *
 * Implements a thin top progress bar for pending client navigations in Next.js 16.
 *
 * Grounded in official Next.js documentation:
 * - node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md (Lines 230–267)
 * - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md (Lines 12–75)
 * - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md (Lines 6–77)
 */

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import {
  DashboardSkeleton,
  ProfileSkeleton,
  OnboardingSkeleton,
  EditorSkeleton,
} from '@/components/ui/LoadingSystem';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete navigation when route changes
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsNavigating(false);
      setTargetHref(null);
      setProgress(100);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    });

    const doneTimer = setTimeout(() => {
      setProgress(0);
    }, 150);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(doneTimer);
    };
  }, [pathname]);

  // Intercept link clicks to show immediate progress feedback and instant skeleton
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external links, downloads, hash links, or modified clicks (new tab)
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        target.hasAttribute('download') ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's the exact same pathname
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      // Start progress bar animation
      setProgress(25);

      // Only mount instant skeleton for core app routes
      if (
        href.startsWith('/dashboard') ||
        href.startsWith('/profile') ||
        href.startsWith('/onboarding') ||
        href.startsWith('/editor')
      ) {
        setIsNavigating(true);
        setTargetHref(href);

        // Auto-dismiss skeleton after 30s safety window
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(() => {
          setIsNavigating(false);
          setTargetHref(null);
        }, 30000);
      }

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return prev + Math.floor(Math.random() * 15 + 5);
        });
      }, 150);
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  if (progress === 0 && !isNavigating) return null;

  return (
    <>
      <div
        id="navigation-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Page navigation progress"
        className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none bg-transparent"
      >
        <div
          className="h-full bg-[#800021] shadow-[0_0_8px_#800021] transition-all duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {isNavigating && targetHref && (
        <div className="fixed inset-0 z-40 bg-[#FFFFFF] overflow-y-auto animate-in fade-in duration-100">
          {targetHref.startsWith('/dashboard') ? (
            <DashboardSkeleton />
          ) : targetHref.startsWith('/profile') ? (
            <ProfileSkeleton />
          ) : targetHref.startsWith('/onboarding') ? (
            <OnboardingSkeleton />
          ) : targetHref.startsWith('/editor') ? (
            <EditorSkeleton />
          ) : null}
        </div>
      )}
    </>
  );
}

/**
 * LinkWithPendingStatus
 *
 * Utilizes the official Next.js 16 `useLinkStatus` hook from `next/link`
 * to provide inline pending feedback as described in Next.js docs.
 */
function LinkStatusIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden="true"
      className="inline-block w-1.5 h-1.5 rounded-full bg-[#800021] animate-ping ml-1"
    />
  );
}

export function PendingAwareLink({
  href,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={className} {...props}>
      {children}
      <LinkStatusIndicator />
    </Link>
  );
}
