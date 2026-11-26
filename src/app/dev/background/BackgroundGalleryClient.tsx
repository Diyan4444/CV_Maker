'use client';

import React, { useEffect, useState } from 'react';
import { FloatCard } from '@/components/ui/FloatCard';
import { TOPO_ICON_TYPES, getTopoColors } from '@/lib/background/topo';
import { WARM_TOKENS, ON_DARK_TOKENS } from '@/styles/tokens';

export function BackgroundGalleryClient() {
  const [frameCount, setFrameCount] = useState(0);
  const [bgMode, setBgMode] = useState('initializing');
  const [iconCount, setIconCount] = useState(0);
  const [motionOff, setMotionOff] = useState(false);

  const colors = getTopoColors();

  useEffect(() => {
    const id = setInterval(() => {
      const state = (window as unknown as {
        __TOPO_BG_STATE__?: { frameCount: number; mode: string; iconCount: number };
      }).__TOPO_BG_STATE__;
      if (state) {
        setFrameCount(state.frameCount);
        setBgMode(state.mode);
        setIconCount(state.iconCount);
      }
    }, 150);
    return () => clearInterval(id);
  }, []);

  const toggleMotion = () => {
    const next = !motionOff;
    setMotionOff(next);
    if (next) {
      document.documentElement.dataset.motion = 'off';
    } else {
      delete document.documentElement.dataset.motion;
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6 sm:p-8 space-y-6">
      {/* Direct on-dark header */}
      <header className="space-y-2 py-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: ON_DARK_TOKENS.onDarkInk }}>
          Topographic Background &amp; Floating Surfaces Gallery
        </h1>
        <p className="text-xs sm:text-sm max-w-[70ch]" style={{ color: ON_DARK_TOKENS.onDarkMuted }}>
          Inspect the WebGL2 contour field, seeded 9-icon SVG sprite, zero-idle-frame counter, and FloatCard surfaces.
        </p>
      </header>

      {/* Frame Counter & Motion Controls */}
      <FloatCard
        as="section"
        floatIndex={0}
        className="rounded-xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: WARM_TOKENS.surface, borderColor: WARM_TOKENS.borderSubtle }}
      >
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: WARM_TOKENS.muted }}>
            Render Loop Telemetry
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold" style={{ color: WARM_TOKENS.ink }}>
            <span>
              Frames rendered: <strong data-testid="topo-frame-count">{frameCount}</strong>
            </span>
            <span>
              Mode: <strong data-testid="topo-mode">{bgMode}</strong>
            </span>
            <span>
              Icons placed: <strong data-testid="topo-icon-count">{iconCount}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleMotion}
          className="min-h-[44px] px-4 rounded-lg border text-xs font-semibold"
          style={{
            backgroundColor: motionOff ? WARM_TOKENS.primary : WARM_TOKENS.surface,
            color: motionOff ? WARM_TOKENS.primaryText : WARM_TOKENS.ink,
            borderColor: WARM_TOKENS.borderDefault,
          }}
        >
          {motionOff ? 'data-motion="off" (Active)' : 'Disable Motion (data-motion="off")'}
        </button>
      </FloatCard>

      {/* 9-Icon Sprite Specimen */}
      <FloatCard
        as="section"
        floatIndex={1}
        className="rounded-xl border p-6 shadow-sm space-y-4"
        style={{ backgroundColor: WARM_TOKENS.surface, borderColor: WARM_TOKENS.borderSubtle }}
      >
        <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
          9 Outline SVG Sprite Icons (24&times;24, stroke 1.25)
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-3">
          {TOPO_ICON_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-lg border p-3 flex flex-col items-center gap-2"
              style={{ backgroundColor: WARM_TOKENS.surface1, borderColor: WARM_TOKENS.borderSubtle }}
            >
              <svg width="24" height="24" style={{ color: WARM_TOKENS.ink }} aria-hidden="true">
                <use href={`#topo-icon-${type}`} />
              </svg>
              <span className="text-[11px] font-medium capitalize" style={{ color: WARM_TOKENS.muted }}>
                {type}
              </span>
            </div>
          ))}
        </div>
      </FloatCard>

      {/* Charcoal & Contour Palette Swatches */}
      <FloatCard
        as="section"
        floatIndex={2}
        className="rounded-xl border p-6 shadow-sm space-y-4"
        style={{ backgroundColor: WARM_TOKENS.surface, borderColor: WARM_TOKENS.borderSubtle }}
      >
        <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
          OKLab Charcoal &amp; Contour Ramp
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(colors).map(([name, hex]) => (
            <div key={name} className="rounded-lg border p-2.5 space-y-1.5" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
              <div className="h-10 rounded border" style={{ backgroundColor: hex, borderColor: WARM_TOKENS.borderSubtle }} />
              <div className="text-xs font-semibold capitalize" style={{ color: WARM_TOKENS.ink }}>{name}</div>
              <div className="text-[11px] font-mono" style={{ color: WARM_TOKENS.muted }}>{hex}</div>
            </div>
          ))}
        </div>
      </FloatCard>
    </main>
  );
}
