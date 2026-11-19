'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BACKGROUND_RECIPES, BackgroundRecipe } from '@/config/backgrounds';
import { ColorField } from '@/components/canvas/ColorField';
import { Maximize2, Minimize2, Sparkles, Compass } from 'lucide-react';

export function DevBackgroundsGallery() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F1F7F7] p-8 text-sm">Loading background gallery...</div>}>
      <DevBackgroundsGalleryInner />
    </Suspense>
  );
}

function DevBackgroundsGalleryInner() {
  const searchParams = useSearchParams();
  const pure = searchParams?.get('pure') === '1';
  const paramRecipeId = searchParams?.get('recipe');

  const [fullscreenRecipe, setFullscreenRecipe] = useState<BackgroundRecipe | null>(() => {
    if (paramRecipeId && BACKGROUND_RECIPES[paramRecipeId]) {
      return BACKGROUND_RECIPES[paramRecipeId];
    }
    return null;
  });

  // Pure canvas mode for direct background review and capture
  if (pure && paramRecipeId && BACKGROUND_RECIPES[paramRecipeId]) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden">
        <ColorField forcedRecipeId={paramRecipeId} />
      </div>
    );
  }

  const recipes = Object.values(BACKGROUND_RECIPES);

  return (
    <div className="min-h-screen p-6 sm:p-12 relative text-[#1A1A1A]">
      {/* Fullscreen Overlay Mode */}
      {fullscreenRecipe && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 pointer-events-auto">
          <ColorField forcedRecipeId={fullscreenRecipe.id} />
          
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] p-4 rounded-lg shadow-lg max-w-md pointer-events-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#D9D9D9]">
              <span className="font-display font-bold text-sm text-[#0B0B0B]">
                {fullscreenRecipe.name} ({fullscreenRecipe.id})
              </span>
              <button
                type="button"
                onClick={() => setFullscreenRecipe(null)}
                className="p-1 rounded hover:bg-[#F1F7F7] text-[#6B6B6B] hover:text-[#0B0B0B]"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#333333] mt-2">{fullscreenRecipe.description}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-[#6B6B6B]">
              <Sparkles className="w-3.5 h-3.5 text-[#800021]" />
              <span>Move mouse to observe organic attractor warping &amp; lightness bloom</span>
            </div>
          </div>

          <div className="self-end pointer-events-auto">
            <button
              type="button"
              onClick={() => setFullscreenRecipe(null)}
              className="px-4 py-2 bg-[#0B0B0B] text-[#FFFFFF] rounded-md text-xs font-medium hover:bg-[#333333] transition-colors"
            >
              Exit Fullscreen View (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Main Gallery View */}
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-[#D9D9D9] pb-6 bg-[#FFFFFF]/90 p-6 rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFE4D8] text-[#800021] text-[11px] font-semibold tracking-wider uppercase mb-2">
                <Compass className="w-3.5 h-3.5" />
                Dev-Only Visual Review
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-[#0B0B0B]">
                ColorField Recipe Gallery
              </h1>
              <p className="text-xs text-[#6B6B6B] mt-1 max-w-2xl">
                Persistent full-viewport procedural color field engine. Palettes blend across edges into a luminous center blend using OKLab perceptual color space and organic noise domain warping.
              </p>
            </div>
            <div className="text-right text-xs text-[#6B6B6B]">
              <div>Target: 60 FPS</div>
              <div>Scale: 0.5x buffer (upscaled)</div>
            </div>
          </div>
        </header>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((r) => {
            const palettes = Array.from(new Set(r.anchors.map((a) => a.palette))).join(', ');
            return (
              <div
                key={r.id}
                className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                {/* Live Preview Window */}
                <div className="relative h-48 w-full bg-[#F1F7F7] overflow-hidden border-b border-[#D9D9D9]">
                  <ColorField forcedRecipeId={r.id} className="!absolute" />
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      type="button"
                      onClick={() => setFullscreenRecipe(r)}
                      className="p-1.5 rounded-md bg-[#FFFFFF]/90 border border-[#D9D9D9] text-[#1A1A1A] hover:bg-[#FFFFFF] hover:text-[#800021] shadow-xs transition-colors"
                      title="Test Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recipe Metadata */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-bold text-[#0B0B0B]">
                        {r.name}
                      </h2>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F7F7] text-[#333333] border border-[#D9D9D9]">
                        {r.id}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-1">{r.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#D9D9D9] flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Palettes: <strong className="text-[#0B0B0B]">{palettes}</strong></span>
                    <span>Speed: <strong className="text-[#0B0B0B]">{r.motion.driftSpeed}</strong></span>
                    <button
                      type="button"
                      onClick={() => setFullscreenRecipe(r)}
                      className="text-[#800021] hover:underline font-medium text-xs ml-2"
                    >
                      View Live →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
