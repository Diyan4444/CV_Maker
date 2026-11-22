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

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete navigation when route changes
  useEffect(() => {
    let doneTimer: NodeJS.Timeout | null = null;
    const frameId = requestAnimationFrame(() => {
      setProgress(100);
      doneTimer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [pathname]);

  // Intercept link clicks to show immediate progress feedback
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
      setIsNavigating(true);
      setProgress(25);

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
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
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
