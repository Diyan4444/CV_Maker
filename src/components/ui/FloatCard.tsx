'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FLOAT } from '@/config/app';

const MAX_ANIMATING_CARDS = 12;
const activeFloatIds = new Set<string>();

interface FloatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Optional index to stagger period (7-10s) and phase offset */
  floatIndex?: number;
  /** Disable floating for this specific element (e.g. dialogs, toasts) */
  disabled?: boolean;
  as?: 'div' | 'section' | 'aside';
}

export function FloatCard({
  children,
  floatIndex = 0,
  disabled = false,
  as = 'div',
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: FloatCardProps) {
  const id = useId();
  const pathname = usePathname() || '';
  const ref = useRef<HTMLDivElement | null>(null);

  const [inView, setInView] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [slotGranted, setSlotGranted] = useState(false);

  const isEditorRoute = pathname.startsWith('/editor');

  useEffect(() => {
    const checkMotion = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const htmlOff = document.documentElement.dataset.motion === 'off';
      setMotionAllowed(FLOAT.enabled && !disabled && !isEditorRoute && !reduced && !htmlOff);
    };
    checkMotion();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', checkMotion);

    const attrObserver = new MutationObserver(checkMotion);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    const checkDialogs = () => {
      setDialogOpen(Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')));
    };
    checkDialogs();
    const bodyObserver = new MutationObserver(checkDialogs);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mq.removeEventListener('change', checkMotion);
      attrObserver.disconnect();
      bodyObserver.disconnect();
    };
  }, [disabled, isEditorRoute]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setInView(entries[0].isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wantsAnimation = motionAllowed && inView && !hovered && !focusedWithin && !dialogOpen;

  useEffect(() => {
    if (!motionAllowed) {
      activeFloatIds.delete(id);
      queueMicrotask(() => setSlotGranted(false));
      return;
    }
    if (activeFloatIds.has(id)) {
      queueMicrotask(() => setSlotGranted(true));
    } else if (activeFloatIds.size < MAX_ANIMATING_CARDS) {
      activeFloatIds.add(id);
      queueMicrotask(() => setSlotGranted(true));
    } else {
      queueMicrotask(() => setSlotGranted(false));
    }
    return () => {
      activeFloatIds.delete(id);
    };
  }, [id, motionAllowed]);

  const isAnimating = wantsAnimation && slotGranted;
  const durationSec = 7 + ((floatIndex * 1.1) % 3); // 7.0s .. 10.0s
  const delaySec = -((floatIndex * 1.7) % durationSec);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      data-float-card="true"
      data-float-state={isAnimating ? 'running' : motionAllowed && slotGranted ? 'paused' : 'disabled'}
      className={className}
      style={{
        ...style,
        willChange: motionAllowed && slotGranted ? 'transform' : undefined,
        animationName: motionAllowed && slotGranted ? 'floatCardBob' : undefined,
        animationDuration: motionAllowed && slotGranted ? `${durationSec.toFixed(2)}s` : undefined,
        animationTimingFunction: motionAllowed && slotGranted ? 'ease-in-out' : undefined,
        animationIterationCount: motionAllowed && slotGranted ? 'infinite' : undefined,
        animationDelay: motionAllowed && slotGranted ? `${delaySec.toFixed(2)}s` : undefined,
        animationPlayState: isAnimating ? 'running' : 'paused',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
        setFocusedWithin(true);
        onFocus?.(e);
      }}
      onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocusedWithin(false);
        }
        onBlur?.(e);
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
