'use client';

import { useEffect } from 'react';

export const MOTION_STORAGE_KEY = 'quillfolio_motion';

export function getInitialMotionEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (saved === 'off') return false;
    if (saved === 'on') return true;
  } catch {
    // ignore storage errors
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applyMotionPreference(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    delete document.documentElement.dataset.motion;
  } else {
    document.documentElement.dataset.motion = 'off';
  }
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore storage errors
  }
}

export function MotionInitializer() {
  useEffect(() => {
    const enabled = getInitialMotionEnabled();
    if (!enabled) {
      document.documentElement.dataset.motion = 'off';
    } else {
      delete document.documentElement.dataset.motion;
    }
  }, []);

  return null;
}
