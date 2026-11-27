'use client';

import { useEffect } from 'react';
import {
  FLOAT_AMPLITUDE_PX,
  INTERFACE_STORAGE_KEYS,
  readStoredAnimationsPref,
  readStoredBgLevelPref,
  readStoredFloatPref,
  readStoredGlassPref,
  resolveEffectiveGlass,
  resolveEffectiveMotion,
  setAnimationsPreference,
} from '@/lib/preferences/interface';

export const MOTION_STORAGE_KEY = INTERFACE_STORAGE_KEYS.animations;

export function getInitialMotionEnabled(): boolean {
  const pref = readStoredAnimationsPref();
  return resolveEffectiveMotion(pref) === 'on';
}

export function applyMotionPreference(enabled: boolean): void {
  setAnimationsPreference(enabled ? 'on' : 'off');
}

export function MotionInitializer() {
  useEffect(() => {
    const animPref = readStoredAnimationsPref();
    const floatPref = readStoredFloatPref();
    const glassPref = readStoredGlassPref();
    const bgPref = readStoredBgLevelPref();

    // Apply to DOM without writing defaults back to localStorage
    const root = document.documentElement;
    root.dataset.motionPref = animPref;
    root.dataset.motion = resolveEffectiveMotion(animPref);
    root.dataset.float = floatPref;
    root.style.setProperty('--float-amp', `${FLOAT_AMPLITUDE_PX[floatPref]}px`);
    root.dataset.glassPref = glassPref;
    root.dataset.glass = resolveEffectiveGlass(glassPref);
    root.dataset.bgLevel = bgPref;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMqChange = () => {
      if (readStoredAnimationsPref() === 'system') {
        document.documentElement.dataset.motion = resolveEffectiveMotion('system');
      }
    };
    mq.addEventListener('change', onMqChange);

    // Glass Auto performance downgrade: 3 consecutive frames > 24ms while cursor moves -> lite for session
    let consecutiveSlowFrames = 0;
    let rafId: number | null = null;
    let lastTs = 0;
    let cursorMoving = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = (ts: number) => {
      if (lastTs > 0 && cursorMoving) {
        const dt = ts - lastTs;
        if (dt > 24) {
          consecutiveSlowFrames++;
          if (
            consecutiveSlowFrames >= 3 &&
            document.documentElement.dataset.glassPref === 'auto' &&
            document.documentElement.dataset.glass !== 'lite'
          ) {
            document.documentElement.dataset.glass = 'lite';
            cursorMoving = false;
            rafId = null;
            return;
          }
        } else {
          consecutiveSlowFrames = 0;
        }
      }
      lastTs = ts;
      if (cursorMoving) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        lastTs = 0;
      }
    };

    const onPointerMove = () => {
      if (
        document.documentElement.dataset.glassPref !== 'auto' ||
        document.documentElement.dataset.glass === 'lite'
      ) {
        return;
      }
      cursorMoving = true;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        cursorMoving = false;
        consecutiveSlowFrames = 0;
      }, 150);
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onStorage = (e: StorageEvent) => {
      if (e.key === INTERFACE_STORAGE_KEYS.glass) {
        document.documentElement.dataset.glassPref = readStoredGlassPref();
        document.documentElement.dataset.glass = resolveEffectiveGlass(readStoredGlassPref());
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mq.removeEventListener('change', onMqChange);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('storage', onStorage);
      if (idleTimer) clearTimeout(idleTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
