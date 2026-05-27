'use client';

/**
 * ─── ThemeProvider ────────────────────────────────────────────────
 *
 *   Base color scheme:  dark (default) ↔ light
 *   Glass overhaul:     glassMode on/off — completely independent
 *
 * data-theme="dark | light"   on <html> — controls palette
 * data-glass="true"           on <html> — activates Liquid Glass overhaul
 *
 * The two are fully orthogonal so glass can overlay either theme.
 * ──────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme:       Theme;
  glassMode:   boolean;
  toggle:      () => void;          // dark ↔ light
  toggleGlass: () => void;          // glass on/off
  setTheme:    (t: Theme) => void;
  setGlassMode:(on: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:        'dark',
  glassMode:    false,
  toggle:       () => {},
  toggleGlass:  () => {},
  setTheme:     () => {},
  setGlassMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(t: Theme) {
  if (t === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
}

function applyGlass(on: boolean) {
  if (on) {
    document.documentElement.setAttribute('data-glass', 'true');
  } else {
    document.documentElement.removeAttribute('data-glass');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,     setThemeState]     = useState<Theme>('dark');
  const [glassMode, setGlassModeState] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const savedTheme  = localStorage.getItem('harmony-theme') as Theme | null;
    const savedGlass  = localStorage.getItem('harmony-glass') === 'true';
    const validTheme  = savedTheme === 'light' ? 'light' : 'dark';

    setThemeState(validTheme);
    setGlassModeState(savedGlass);
    applyTheme(validTheme);
    applyGlass(savedGlass);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem('harmony-theme', next);
    applyTheme(next);
  }

  function setGlassMode(on: boolean) {
    setGlassModeState(on);
    localStorage.setItem('harmony-glass', String(on));
    applyGlass(on);
  }

  function toggle() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  function toggleGlass() {
    setGlassMode(!glassMode);
  }

  return (
    <ThemeContext.Provider value={{ theme, glassMode, toggle, toggleGlass, setTheme, setGlassMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
