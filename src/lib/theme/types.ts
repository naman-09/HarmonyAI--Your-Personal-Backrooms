// ─── Dynamic theming — type definitions ──────────────────────
// Builds on the existing Open-Meteo / time-of-day infrastructure.

import type { TimeOfDay } from '@/hooks/use-user-context';
import type { WeatherCondition } from '@/lib/weather';

/** India-relevant seasonal phases. */
export type Season = 'winter' | 'spring' | 'summer' | 'monsoon' | 'autumn';

/** How animated the UI should be. */
export type MotionMode = 'dynamic' | 'static' | 'reduced' | 'auto';

/** Atmospheric particle effects. */
export type ParticleType = 'none' | 'rain' | 'snow' | 'fireflies' | 'dust';

export interface ThemePalette {
  /** Two-stop background gradient (primary visual). */
  gradient:     [string, string, string];   // top-left, mid, bottom-right
  /** Accent overlay gradient (subtle wash on top). */
  overlay?:     string;
  /** Foreground glow color (used for icon halos, shadow accents). */
  glow:         string;
  /** Color used by --weather-tint for legacy components. */
  tint:         string;
  /** What the tint feels like, in plain words. */
  mood:         string;
}

export interface ThemePreset {
  id:           string;
  name:         string;
  description:  string;

  // What this preset is best for. The selector scores presets against the
  // current context; whichever matches the most wins (with priority breaking ties).
  match: {
    timePhases?:        TimeOfDay[];
    weatherConditions?: WeatherCondition[];
    seasons?:           Season[];
    /** Optional temperature range in °C. */
    tempC?:             { min?: number; max?: number };
  };

  /** Higher number = preferred when scores tie. */
  priority:     number;

  palette:      ThemePalette;

  /** Particle effect to show in `dynamic` motion mode. */
  particles:    ParticleType;
  /** Particle density 0–1 (`dynamic` mode only). */
  particleDensity: number;
}

/**
 * Everything a consumer of `useThemeEngine()` gets back.
 * This is what the ThemedBackground component reads, what Settings shows,
 * and what the AI's system prompt receives for contextual awareness.
 */
export interface ThemeState {
  preset:        ThemePreset;
  timePhase:     TimeOfDay;
  weatherCondition: WeatherCondition | null;
  season:        Season;
  temperatureC:  number | null;
  motionMode:    MotionMode;
  /** Resolved (auto → dynamic|reduced). */
  effectiveMotion: 'dynamic' | 'static' | 'reduced';
  /** User-set manual override, if any. */
  override:      string | null;
  /** Local sunrise/sunset (Unix ms) when available. */
  sunrise?:      number;
  sunset?:       number;
}
