'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OVERSCROLL_EFFECT } from '@/config/app';

const MAX_PULL_PX = 56;
const REFRESH_THRESHOLD_PX = 42;
const REFRESH_COOLDOWN_MS = 3000;

function isAppleDesktopPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh|iPhone|iPad|iPod/i.test(ua);
}

export function OverscrollController({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !OVERSCROLL_EFFECT) return;

    // Excluded routes
    if (pathname.startsWith('/editor') || pathname.startsWith('/onboarding')) {
      return;
    }

    // Desktop non-Apple fine pointer only
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const isCoarseOnly =
      window.matchMedia('(pointer: coarse)').matches && !finePointer;
    if (!finePointer || isCoarseOnly || isAppleDesktopPlatform()) {
      return;
    }

    const isMotionAllowed = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const htmlOff = document.documentElement.dataset.motion === 'off';
      return !reduced && !htmlOff;
    };

    let pullAccum = 0;
    let currentOffset = 0;
    let rafId: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRefreshAt = 0;

    const applyTransform = (px: number) => {
      currentOffset = px;
      if (px <= 0.05) {
        wrapper.style.transform = '';
        wrapper.dataset.overscrollPx = '0';
      } else {
        wrapper.style.transform = `translate3d(0, ${px.toFixed(2)}px, 0)`;
        wrapper.dataset.overscrollPx = px.toFixed(1);
      }
    };

    const springBack = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      const startOffset = currentOffset;
      if (startOffset <= 0.05) {
        pullAccum = 0;
        applyTransform(0);
        return;
      }

      const startTime = performance.now();
      const duration = 600;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        // Damped spring ease-out
        const eased = 1 - Math.pow(1 - t, 3);
        const nextPx = startOffset * (1 - eased);
        applyTransform(nextPx);
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          rafId = null;
          pullAccum = 0;
          applyTransform(0);
        }
      };
      rafId = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (!isMotionAllowed()) return;
      if (window.scrollY > 0) {
        if (currentOffset > 0) {
          pullAccum = 0;
          applyTransform(0);
        }
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')) {
        return;
      }

      if (e.deltaY < 0) {
        pullAccum += Math.abs(e.deltaY);
        const resisted = MAX_PULL_PX * (1 - Math.exp(-pullAccum / 180));
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        rafId = requestAnimationFrame(() => {
          rafId = null;
          applyTransform(resisted);
        });

        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          const pulled = currentOffset;
          springBack();

          if (
            pathname === '/dashboard' &&
            pulled >= REFRESH_THRESHOLD_PX &&
            Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS &&
            !document.querySelector('[data-unsaved="true"]')
          ) {
            lastRefreshAt = Date.now();
            router.refresh();
          }
        }, 220);
      } else if (currentOffset > 0 && e.deltaY > 0) {
        pullAccum = Math.max(0, pullAccum - e.deltaY);
        const resisted = MAX_PULL_PX * (1 - Math.exp(-pullAccum / 180));
        applyTransform(resisted);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (settleTimer) clearTimeout(settleTimer);
      wrapper.style.transform = '';
      delete wrapper.dataset.overscrollPx;
    };
  }, [pathname, router]);

  return (
    <div id="overscroll-wrapper" ref={wrapperRef} className="relative z-10 min-h-screen">
      {children}
    </div>
  );
}
