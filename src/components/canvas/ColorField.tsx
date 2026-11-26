'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BACKGROUND_RECIPES,
  BackgroundRecipe,
  CURSOR_FOLLOW,
  getRecipeForPathname,
} from '@/config/backgrounds';
import { createWebGLRenderer, WebGLRenderer } from '@/lib/color/webgl-engine';

interface ColorFieldProps {
  /** Optional override for gallery previews */
  forcedRecipeId?: string;
  className?: string;
}

export function ColorField({ forcedRecipeId, className = '' }: ColorFieldProps) {
  const pathname = usePathname() || '/';
  
  // Resolve active recipe
  const targetRecipe = forcedRecipeId
    ? BACKGROUND_RECIPES[forcedRecipeId] || BACKGROUND_RECIPES.default
    : getRecipeForPathname(pathname);

  // If no recipe matches, render nothing
  if (!targetRecipe) {
    return null;
  }

  return <ColorFieldRenderer recipe={targetRecipe} className={className} />;
}

function ColorFieldRenderer({
  recipe,
  className = '',
}: {
  recipe: BackgroundRecipe;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Pointer state (smoothed with lerp)
  const pointerTarget = useRef<[number, number]>([0.5, 0.5]);
  const pointerCurrent = useRef<[number, number]>([0.5, 0.5]);

  // Interpolation state between recipes
  const currentRecipeRef = useRef<BackgroundRecipe>(recipe);
  const transitionStartRef = useRef<number>(0);
  const previousRecipeRef = useRef<BackgroundRecipe>(recipe);

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Update target recipe with 1-second transition
  useEffect(() => {
    if (currentRecipeRef.current.id !== recipe.id) {
      previousRecipeRef.current = currentRecipeRef.current;
      currentRecipeRef.current = recipe;
      transitionStartRef.current = performance.now();
    }
  }, [recipe]);

  // Window pointer tracker (passive, attached only when CURSOR_FOLLOW is enabled)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __COLORFIELD_POINTER_ATTACHED__?: boolean }).__COLORFIELD_POINTER_ATTACHED__ = CURSOR_FOLLOW;
    }
    if (!CURSOR_FOLLOW) return;

    const handlePointerMove = (e: PointerEvent) => {
      const x = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
      const y = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
      pointerTarget.current = [x, y];
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (typeof window !== 'undefined') {
        (window as unknown as { __COLORFIELD_POINTER_ATTACHED__?: boolean }).__COLORFIELD_POINTER_ATTACHED__ = false;
      }
    };
  }, []);

  // WebGL initialization & Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createWebGLRenderer(canvas);
    if (!renderer) {
      setHasWebGL(false);
      return;
    }
    rendererRef.current = renderer;
    setHasWebGL(true);

    let animationFrameId: number;
    let isTabVisible = !document.hidden;

    // Adaptive quality state (initial 0.5x internal buffer resolution)
    let currentScale = 0.5;

    // Resize handler (rendered at adaptive scale for optimal 60fps performance)
    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      // Downscale internal buffer by currentScale for smooth rasterization
      const targetWidth = Math.max(160, Math.floor(w * currentScale * dpr));
      const targetHeight = Math.max(120, Math.floor(h * currentScale * dpr));
      renderer.resize(targetWidth, targetHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Window focus tracking (safe across headless test environments and real browsers)
    let isWindowFocused = true;
    const onFocus = () => { isWindowFocused = true; };
    const onBlur = () => { isWindowFocused = false; };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    // Energy management: Pointer idle tracking and coarse pointer detection
    let lastPointerTime = performance.now();
    const isCoarse =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;

    const onPointerActivity = () => {
      lastPointerTime = performance.now();
    };
    if (CURSOR_FOLLOW) {
      window.addEventListener('pointermove', onPointerActivity, { passive: true });
      window.addEventListener('pointerdown', onPointerActivity, { passive: true });
    }

    // Adaptive quality metrics: rolling 2-second window
    let windowStartTime = performance.now();
    let frameTimes: number[] = [];
    let lastFrameTime = performance.now();
    let lastRenderTime = 0;

    // Track actual WebGL draw execution timestamps for draw-rate analysis
    const actualDrawTimestamps: number[] = [];

    // Expose debug info in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      (window as unknown as { __colorfield_debug: unknown }).__colorfield_debug = {
        rendererInfo: renderer.getDebugInfo(),
        getScale: () => currentScale,
        setScale: (s: number) => {
          currentScale = s;
          handleResize();
        },
        getDrawRate: () => {
          if (actualDrawTimestamps.length < 5) return { avgMs: 0, fps: 0 };
          const deltas = [];
          for (let i = 1; i < actualDrawTimestamps.length; i++) {
            deltas.push(actualDrawTimestamps[i] - actualDrawTimestamps[i - 1]);
          }
          const sum = deltas.reduce((a, b) => a + b, 0);
          const avgMs = sum / deltas.length;
          return { avgMs, fps: 1000 / avgMs, sampleCount: deltas.length };
        },
      };
    }

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const startTime = performance.now();

    // Render loop
    const tick = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      // Energy management:
      // Cap to ~30 FPS (min 32ms) when pointer has been idle for >= 5s,
      // on touch/coarse devices, or when window is not focused.
      const isIdle = now - lastPointerTime > 5000;
      const shouldCap30 = isIdle || isCoarse || !isWindowFocused;
      const minInterval = shouldCap30 ? 32 : 0;

      if (now - lastRenderTime < minInterval) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      lastRenderTime = now;

      // Adaptive quality monitoring:
      // If p95 exceeds 20ms over a 2-second window, automatically lower render scale
      if (!shouldCap30) {
        frameTimes.push(delta);
        if (now - windowStartTime >= 2000) {
          if (frameTimes.length > 20) {
            frameTimes.sort((a, b) => a - b);
            const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
            if (p95 > 20.0) {
              if (currentScale > 0.35) {
                currentScale = 0.35;
                handleResize();
              } else if (currentScale > 0.25) {
                currentScale = 0.25;
                handleResize();
              }
            }
          }
          frameTimes = [];
          windowStartTime = now;
        }
      }

      if (isTabVisible && rendererRef.current) {
        const elapsedSeconds = (now - startTime) / 1000;

        // Smooth pointer tracking (spring / lerp)
        const lerpFactor = reducedMotion ? 1.0 : 0.08;
        pointerCurrent.current[0] +=
          (pointerTarget.current[0] - pointerCurrent.current[0]) * lerpFactor;
        pointerCurrent.current[1] +=
          (pointerTarget.current[1] - pointerCurrent.current[1]) * lerpFactor;

        // Route recipe transition over ~1.0s
        const transitionProgress = Math.min(
          1.0,
          (now - transitionStartRef.current) / 1000
        );
        let activeRenderRecipe = currentRecipeRef.current;

        // If in transition, interpolate anchor positions
        if (
          transitionProgress < 1.0 &&
          previousRecipeRef.current.id !== currentRecipeRef.current.id
        ) {
          const prev = previousRecipeRef.current;
          const curr = currentRecipeRef.current;
          const t = transitionProgress; // Smooth interpolation factor

          activeRenderRecipe = {
            ...curr,
            anchors: curr.anchors.map((ca, i) => {
              const pa = prev.anchors[i] || ca;
              return {
                ...ca,
                position: [
                  pa.position[0] + (ca.position[0] - pa.position[0]) * t,
                  pa.position[1] + (ca.position[1] - pa.position[1]) * t,
                ],
                radius: pa.radius + (ca.radius - pa.radius) * t,
                weight: pa.weight + (ca.weight - pa.weight) * t,
              };
            }),
          };
        }

        const aspect = canvas.width / canvas.height;
        const renderMotion = CURSOR_FOLLOW
          ? activeRenderRecipe
          : {
              ...activeRenderRecipe,
              motion: {
                ...activeRenderRecipe.motion,
                pointerSensitivity: 0.0,
                pointerBloom: 0.0,
              },
            };
        const renderCoords: [number, number] = CURSOR_FOLLOW ? pointerCurrent.current : [0.5, 0.5];

        if (typeof window !== 'undefined') {
          (window as unknown as { __COLORFIELD_MOTION_STATE__?: { cursorFollow: boolean; pointerCoords: [number, number]; pointerSensitivity: number; pointerBloom: number } }).__COLORFIELD_MOTION_STATE__ = {
            cursorFollow: CURSOR_FOLLOW,
            pointerCoords: renderCoords,
            pointerSensitivity: renderMotion.motion.pointerSensitivity,
            pointerBloom: renderMotion.motion.pointerBloom,
          };
        }

        rendererRef.current.render(
          elapsedSeconds,
          renderCoords,
          renderMotion,
          reducedMotion,
          aspect
        );
        actualDrawTimestamps.push(now);
        if (actualDrawTimestamps.length > 120) actualDrawTimestamps.shift();
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      if (CURSOR_FOLLOW) {
        window.removeEventListener('pointermove', onPointerActivity);
        window.removeEventListener('pointerdown', onPointerActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-50 overflow-hidden transition-opacity duration-700 ${className}`}
      style={{
        // Static CSS gradient fallback is always active underneath, preventing any FOUC before JS loads
        background: recipe.fallbackCss,
      }}
    >
      {hasWebGL && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="w-full h-full block"
          style={{
            transform: 'translateZ(0)', // Promote to GPU compositor layer
            imageRendering: 'auto',
          }}
        />
      )}
    </div>
  );
}
