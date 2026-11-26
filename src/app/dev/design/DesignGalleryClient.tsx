'use client';

import React from 'react';
import { wcagContrast } from 'culori';
import { AppShell } from '@/components/navigation/AppShell';
import { FloatCard } from '@/components/ui/FloatCard';
import { BASE_TOKENS, SURFACE_MIXTURES, ACCENT_TINTS, WARM_TOKENS } from '@/styles/tokens';
import { FileText, GraduationCap, CheckCircle2, Clock } from 'lucide-react';

export function DesignGalleryClient() {
  const surfaces = Object.entries(SURFACE_MIXTURES);
  const foregrounds: Array<[string, string]> = [
    ['ink', BASE_TOKENS.ink],
    ['muted', BASE_TOKENS.muted],
    ['accent', BASE_TOKENS.accent],
    ['accentStrong', ACCENT_TINTS.accentStrong],
  ];

  return (
    <div className="min-h-screen relative">
      <AppShell userEmail="designer@quillfolio.dev" currentPath="/dashboard">
        <main className="space-y-8">
          {/* Header */}
          <FloatCard
            as="section"
            floatIndex={1}
            className="rounded-xl border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: WARM_TOKENS.ink }}>
                Phase 8B Warm Design Gallery
              </h1>
              <p className="text-xs sm:text-sm mt-1 max-w-[70ch]" style={{ color: WARM_TOKENS.muted }}>
                OKLab-mixed warm surfaces, WCAG contrast matrix, status pills, document rows, and AppShell preview.
              </p>
            </div>
          </FloatCard>

          {/* Tokens & Surface Mixtures */}
          <section
            className="rounded-xl border p-6 shadow-sm space-y-4"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
              Base Tokens &amp; OKLab Surface Mixtures
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {surfaces.map(([name, hex]) => (
                <div
                  key={name}
                  className="rounded-lg border p-3 space-y-2"
                  style={{ backgroundColor: hex, borderColor: WARM_TOKENS.borderSubtle }}
                >
                  <div className="text-xs font-bold" style={{ color: WARM_TOKENS.ink }}>
                    {name}
                  </div>
                  <div className="text-[11px] font-mono" style={{ color: WARM_TOKENS.ink }}>
                    {hex}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contrast Matrix */}
          <section
            className="rounded-xl border p-6 shadow-sm space-y-4"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
              Text Pairing WCAG Ratios
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
                    <th className="py-2 pr-4 font-bold">Surface</th>
                    {foregrounds.map(([fgName, fgHex]) => (
                      <th key={fgName} className="py-2 px-3 font-bold">
                        {fgName} ({fgHex})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surfaces.map(([bgName, bgHex]) => (
                    <tr
                      key={bgName}
                      className="border-b"
                      style={{ borderColor: WARM_TOKENS.borderSubtle, backgroundColor: bgHex }}
                    >
                      <td className="py-2.5 pr-4 font-semibold" style={{ color: WARM_TOKENS.ink }}>
                        {bgName} ({bgHex})
                      </td>
                      {foregrounds.map(([fgName, fgHex]) => {
                        const r = Math.round(wcagContrast(fgHex, bgHex) * 100) / 100;
                        const ok = r >= 4.5;
                        return (
                          <td key={fgName} className="py-2.5 px-3 font-semibold" style={{ color: ok ? fgHex : WARM_TOKENS.ink }}>
                            {r.toFixed(2)}:1 {ok ? '✓' : '(large only)'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status Pills & Sample Document Rows */}
          <section
            className="rounded-xl border overflow-hidden shadow-sm"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
              <h2 className="font-display text-lg font-bold" style={{ color: WARM_TOKENS.ink }}>
                Status Pills &amp; Document Rows
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: WARM_TOKENS.surface2,
                    color: WARM_TOKENS.ink,
                    borderColor: WARM_TOKENS.borderSubtle,
                  }}
                >
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  Draft
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: WARM_TOKENS.readyBg,
                    color: WARM_TOKENS.readyText,
                    borderColor: WARM_TOKENS.readyText,
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  Ready
                </span>
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: WARM_TOKENS.borderSubtle }}>
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: WARM_TOKENS.accentStrong }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: WARM_TOKENS.ink }}>
                      Systems Engineering Resume
                    </div>
                    <div className="text-xs truncate" style={{ color: WARM_TOKENS.muted }}>
                      Backend Engineer &bull; ATS Single Column &bull; Edited 2h ago
                    </div>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0"
                  style={{
                    backgroundColor: WARM_TOKENS.readyBg,
                    color: WARM_TOKENS.readyText,
                    borderColor: WARM_TOKENS.readyText,
                  }}
                >
                  Ready
                </span>
              </div>

              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <GraduationCap className="w-4 h-4 shrink-0" style={{ color: WARM_TOKENS.accentStrong }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: WARM_TOKENS.ink }}>
                      Graduate Research CV
                    </div>
                    <div className="text-xs truncate" style={{ color: WARM_TOKENS.muted }}>
                      PhD Applicant &bull; Academic CV &bull; Edited yesterday
                    </div>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0"
                  style={{
                    backgroundColor: WARM_TOKENS.surface2,
                    color: WARM_TOKENS.ink,
                    borderColor: WARM_TOKENS.borderSubtle,
                  }}
                >
                  Draft
                </span>
              </div>
            </div>
          </section>
        </main>
      </AppShell>
    </div>
  );
}
