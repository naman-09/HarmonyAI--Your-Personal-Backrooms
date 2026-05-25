'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUserContext } from '@/hooks/use-user-context';
import { selectPreset, detectSeason, detectSystemPrefersReducedMotion, resolveMotionMode } from './engine';
import type { MotionMode, ThemeState } from './types';

const MOTION_KEY   = 'harmony-motion-mode';
const OVERRIDE_KEY = 'harmony-theme-override';

interface ThemeStoreValue extends ThemeState {
  /** Switch motion mode (and persist). */
  setMotionMode: (mode: MotionMode) => void;
  /** Force a specific preset, or null to clear. */
  setOverride: (id: string | null) => void;
  /** Force a weather/location refresh. */
  refresh: () => Promise<void>;
}

const ThemeStoreContext = createContext<ThemeStoreValue | null>(null);

function loadMotion(): MotionMode {
  if (typeof window === 'undefined') return 'auto';
  const v = localStorage.getItem(MOTION_KEY);
  return v === 'dynamic' || v === 'static' || v === 'reduced' ? v : 'auto';
}
function loadOverride(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OVERRIDE_KEY);
}

export function ThemeStoreProvider({ children }: { children: React.ReactNode }) {
  const userCtx = useUserContext();

  const [motionMode, setMotionModeState] = useState<MotionMode>(() => loadMotion());
  const [systemReduced, setSystemReduced] = useState(false);
  const [override, setOverrideState] = useState<string | null>(() => loadOverride());

  // ── Watch system prefers-reduced-motion ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener?.(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener?.(onChange);
    };
  }, []);

  const setMotionMode = useCallback((m: MotionMode) => {
    setMotionModeState(m);
    localStorage.setItem(MOTION_KEY, m);
  }, []);

  const setOverride = useCallback((id: string | null) => {
    setOverrideState(id);
    if (id) localStorage.setItem(OVERRIDE_KEY, id);
    else    localStorage.removeItem(OVERRIDE_KEY);
  }, []);

  // ── Compute the active ThemeState ──────────────────────────
  const themeState = useMemo<ThemeState>(() => {
    const season       = detectSeason();
    const weather      = userCtx.weather?.condition ?? null;
    const temperatureC = userCtx.weather?.temperatureC ?? null;

    const preset = selectPreset(
      { timePhase: userCtx.timeOfDay, weather, season, temperatureC },
      override,
    );

    const effectiveMotion = resolveMotionMode(motionMode, systemReduced);

    return {
      preset,
      timePhase:        userCtx.timeOfDay,
      weatherCondition: weather,
      season,
      temperatureC,
      motionMode,
      effectiveMotion,
      override,
      // sunrise/sunset are not exposed by Open-Meteo's current endpoint;
      // we infer day/night from the engine itself.
    };
  }, [userCtx.timeOfDay, userCtx.weather, motionMode, systemReduced, override]);

  // ── Apply CSS variables so legacy components keep working ──
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--weather-tint',        themeState.preset.palette.tint);
    root.style.setProperty('--weather-tint-strong', themeState.preset.palette.tint);
    root.style.setProperty('--theme-glow',          themeState.preset.palette.glow);
    root.setAttribute('data-theme-preset', themeState.preset.id);
    root.setAttribute('data-motion',       themeState.effectiveMotion);
  }, [themeState.preset.id, themeState.preset.palette, themeState.effectiveMotion]);

  const value: ThemeStoreValue = {
    ...themeState,
    setMotionMode,
    setOverride,
    refresh: userCtx.refresh,
  };

  return (
    <ThemeStoreContext.Provider value={value}>
      {children}
    </ThemeStoreContext.Provider>
  );
}

export function useThemeEngine(): ThemeStoreValue {
  const ctx = useContext(ThemeStoreContext);
  if (!ctx) {
    throw new Error('useThemeEngine must be used within ThemeStoreProvider');
  }
  return ctx;
}
