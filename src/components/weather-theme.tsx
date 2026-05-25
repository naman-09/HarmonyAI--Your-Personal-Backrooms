'use client';

import { useEffect } from 'react';
import type { WeatherCondition } from '@/lib/weather';

// ─── Weather → CSS variable overrides ────────────────────────
// Subtle shifts only — the latte/terracotta brand stays recognizable.
// Each condition tweaks bg / surface / primary / muted to evoke the
// outside world.
const THEMES: Record<WeatherCondition, Record<string, string>> = {
  clear: {
    // Default warm latte — no override needed, but keep the keys so we can
    // safely reset when switching
    '--weather-tint':       'transparent',
    '--weather-tint-strong':'transparent',
  },
  cloudy: {
    '--weather-tint':       'rgba(148, 163, 184, 0.10)',  // soft slate
    '--weather-tint-strong':'rgba(100, 116, 139, 0.20)',
  },
  rain: {
    '--weather-tint':       'rgba(96, 125, 165, 0.16)',   // cool blue-grey
    '--weather-tint-strong':'rgba(70, 95, 135, 0.30)',
  },
  snow: {
    '--weather-tint':       'rgba(186, 219, 240, 0.18)',  // pale icy blue
    '--weather-tint-strong':'rgba(160, 200, 230, 0.28)',
  },
  storm: {
    '--weather-tint':       'rgba(80, 60, 130, 0.22)',    // deep dramatic purple
    '--weather-tint-strong':'rgba(60, 50, 110, 0.40)',
  },
  fog: {
    '--weather-tint':       'rgba(180, 180, 180, 0.16)',  // dense grey
    '--weather-tint-strong':'rgba(140, 140, 140, 0.28)',
  },
};

interface Props {
  condition?: WeatherCondition | null;
}

/**
 * Applies a weather-conditional CSS-variable layer to the document root.
 * The actual visual effect comes from globals.css using `--weather-tint`
 * on body::before for a subtle wash, and elements that opt in to
 * `--weather-tint-strong` for accents.
 */
export function WeatherTheme({ condition }: Props) {
  useEffect(() => {
    if (!condition) {
      document.documentElement.removeAttribute('data-weather');
      return;
    }
    const vars = THEMES[condition] ?? THEMES.clear;
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
    document.documentElement.setAttribute('data-weather', condition);
  }, [condition]);

  return null;
}
