'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeSwitcher() {
  const { theme, setTheme, availablePalettes } = useTheme();

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs">
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
  );
}
