'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Palette, PALETTES } from '@/config/palettes';

interface ThemeContextType {
  theme: Palette['id'];
  setTheme: (theme: Palette['id']) => void;
  availablePalettes: Palette[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'mist',
  setTheme: () => {},
  availablePalettes: Object.values(PALETTES),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Palette['id']>('mist');

  useEffect(() => {
    const saved = localStorage.getItem('folio_theme') as Palette['id'];
    if (saved && PALETTES[saved]) {
      // Set attribute directly on element
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'mist');
    }
  }, []);

  const setTheme = (newTheme: Palette['id']) => {
    setThemeState(newTheme);
    localStorage.setItem('folio_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        availablePalettes: Object.values(PALETTES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
