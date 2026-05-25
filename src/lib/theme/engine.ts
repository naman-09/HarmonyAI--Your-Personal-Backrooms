// ─── Theme engine — picks the best preset from current context ──
// Pure functions; no hooks. The React layer (store.tsx) wires this up.

import { PRESETS, FALLBACK_PRESET } from './presets';
import type { Season, ThemePreset } from './types';
import type { TimeOfDay } from '@/hooks/use-user-context';
import type { WeatherCondition } from '@/lib/weather';

// ─── Season detection (India-relevant) ───────────────────────
// IMD's tri-season model doesn't quite match user mental models, so we
// use a five-season approximation: winter, spring, summer, monsoon, autumn.
export function detectSeason(month: number = new Date().getMonth()): Season {
  // month is 0-indexed (Jan = 0)
  if (month === 11 || month === 0 || month === 1) return 'winter';
  if (month === 2  || month === 3)                return 'spring';
  if (month === 4  || month === 5)                return 'summer';
  if (month === 6  || month === 7 || month === 8) return 'monsoon';
  return 'autumn'; // Sep–Nov shoulder; we put Sep into monsoon
}

export function describeSeason(s: Season): string {
  switch (s) {
    case 'winter':  return 'Winter';
    case 'spring':  return 'Spring';
    case 'summer':  return 'Summer';
    case 'monsoon': return 'Monsoon';
    case 'autumn':  return 'Autumn';
  }
}

// ─── Motion mode resolution ──────────────────────────────────
export function detectSystemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function resolveMotionMode(
  user: 'dynamic' | 'static' | 'reduced' | 'auto',
  systemPrefersReduced: boolean,
): 'dynamic' | 'static' | 'reduced' {
  if (user === 'auto') return systemPrefersReduced ? 'reduced' : 'dynamic';
  return user;
}

// ─── Preset scoring ──────────────────────────────────────────
interface ScoringContext {
  timePhase:    TimeOfDay;
  weather:      WeatherCondition | null;
  season:       Season;
  temperatureC: number | null;
}

/**
 * Score how well a preset matches the current context.
 * Higher score = better match. We weight specificity:
 *   - exact weather match: +50
 *   - exact season match:  +30
 *   - exact time match:    +20
 *   - temp range match:    +15
 * Final tie-break uses the preset's own `priority`.
 */
function scorePreset(p: ThemePreset, ctx: ScoringContext): number {
  let score = 0;
  let totalConditions = 0;
  let matchedConditions = 0;

  if (p.match.weatherConditions) {
    totalConditions++;
    if (ctx.weather && p.match.weatherConditions.includes(ctx.weather)) {
      score += 50;
      matchedConditions++;
    } else {
      // Hard-disqualify if a preset specifies weather and ours doesn't match.
      // (Except when ctx.weather is null — we'll still consider it for time/season.)
      if (ctx.weather !== null) return -1;
    }
  }
  if (p.match.seasons) {
    totalConditions++;
    if (p.match.seasons.includes(ctx.season)) {
      score += 30;
      matchedConditions++;
    } else {
      return -1;
    }
  }
  if (p.match.timePhases) {
    totalConditions++;
    if (p.match.timePhases.includes(ctx.timePhase)) {
      score += 20;
      matchedConditions++;
    } else {
      return -1;
    }
  }
  if (p.match.tempC && ctx.temperatureC !== null) {
    totalConditions++;
    const t = ctx.temperatureC;
    const { min, max } = p.match.tempC;
    if ((min === undefined || t >= min) && (max === undefined || t <= max)) {
      score += 15;
      matchedConditions++;
    } else {
      return -1;
    }
  }

  // Reward fully-specified matches (e.g. monsoon + rain beats just rain)
  score += matchedConditions * 5;

  return score;
}

/**
 * Select the best preset for the current context. Ties broken by `priority`.
 */
export function selectPreset(ctx: ScoringContext, override?: string | null): ThemePreset {
  if (override) {
    const forced = PRESETS.find((p) => p.id === override);
    if (forced) return forced;
  }

  // Late-night carve-out: between 22:00 and 04:00 we prefer the
  // late-night meditative preset over night_calm.
  const hour = new Date().getHours();
  if (ctx.timePhase === 'night' && (hour >= 22 || hour < 4) && !ctx.weather) {
    const late = PRESETS.find((p) => p.id === 'late_night_meditative');
    if (late) return late;
  }

  let best = FALLBACK_PRESET;
  let bestScore = -1;
  let bestPriority = -1;

  for (const p of PRESETS) {
    const s = scorePreset(p, ctx);
    if (s < 0) continue;
    if (s > bestScore || (s === bestScore && p.priority > bestPriority)) {
      best = p;
      bestScore = s;
      bestPriority = p.priority;
    }
  }

  return best;
}
