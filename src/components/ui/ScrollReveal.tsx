'use client';

import React, { useEffect, useRef } from 'react';

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Stagger index (60ms per step, capped at 300ms) */
  staggerIndex?: number;
}

/**
 * Progressive-enhancement scroll reveal:
 * - Visible in SSR / no-JS (`opacity: 1`).
 * - Above-the-fold elements are never hidden.
 * - Elements below the viewport animate (fade + 12px rise, 450ms) once when within 15% below viewport.
 * - Zero CLS (opacity + transform only) and disabled under reduced motion / data-motion="off".
 */
export function ScrollReveal({
  children,
  staggerIndex = 0,
  className = '',
  ...rest
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionOff = document.documentElement.dataset.motion === 'off';
    if (reduced || motionOff) return;

    const rect = el.getBoundingClientRect();
    // Never hide above-the-fold or already-within-15%-buffer elements
    if (rect.top <= window.innerHeight * 1.15) {
      el.dataset.revealed = 'true';
      return;
    }

    el.style.opacity = '0';
    el.style.transform = 'translate3d(0, 12px, 0)';
    el.dataset.revealState = 'pending';

    const delay = Math.min(Math.max(0, staggerIndex) * 60, 300);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            el.dataset.revealState = 'animating';

            if (typeof el.animate === 'function') {
              const anim = el.animate(
                [
                  { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
                  { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                ],
                {
                  duration: 450,
                  delay,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  fill: 'forwards',
                }
              );
              anim.onfinish = () => {
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.dataset.revealState = 'done';
                el.dataset.revealed = 'true';
                anim.cancel();
              };
            } else {
              el.style.opacity = '1';
              el.style.transform = 'none';
              el.dataset.revealState = 'done';
              el.dataset.revealed = 'true';
            }
            break;
          }
        }
      },
      { rootMargin: '0px 0px 15% 0px', threshold: 0 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      el.style.opacity = '1';
      el.style.transform = 'none';
    };
  }, [staggerIndex]);

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}
