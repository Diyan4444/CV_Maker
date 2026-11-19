'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeSwitcher() {
  const { theme, setTheme, availablePalettes } = useTheme();

  return (
    <div className="flex items-center text-xs">
      {/* Mobile view: Compact select dropdown with zero overflow even at 320px */}
      <div className="sm:hidden flex items-center gap-1.5 p-1 rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <label htmlFor="theme-select-mobile" className="sr-only">
          Select Palette
        </label>
        <span className="text-[var(--text-muted)] pl-1.5 font-medium text-[11px]">Theme:</span>
        <select
          id="theme-select-mobile"
          value={theme}
          onChange={(e) => setTheme(e.target.value as typeof theme)}
          className="bg-transparent text-[var(--text)] font-medium text-xs pr-1 focus:outline-none"
        >
          {availablePalettes.map((p) => (
            <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text)]">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop view (>= 640px): Full palette pill buttons */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <span className="text-[var(--text-muted)] px-2 font-medium">Theme:</span>
        {availablePalettes.map((p) => {
          const isActive = p.id === theme;
          return (
            <button
              key={p.id}
              onClick={() => setTheme(p.id)}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--surface)]'
                  : 'text-[var(--text)] hover:bg-[var(--surface-alt)]'
              }`}
              title={p.description}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
