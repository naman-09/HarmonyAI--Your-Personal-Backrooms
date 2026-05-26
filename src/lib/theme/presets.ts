// ─── 11 theme presets keyed to (time × weather × season) ────────
// All gradients built from the NEBULA palette:
//   #013026  Deep Ocean Forest
//   #014760  Midnight Lagoon
//   #107e57  Viridian
//   #a1ce3f  Bioluminescent Lime
//   #cbe58e  Seafoam Highlight

import type { ThemePreset } from './types';

export const PRESETS: ThemePreset[] = [
  // ── Cozy rain — deep teal into midnight ──────────────────
  {
    id:          'cozy_rain',
    name:        'Cozy rain',
    description: 'Deep ocean teal — sheltered and quiet.',
    match: {
      weatherConditions: ['rain'],
    },
    priority: 50,
    palette: {
      gradient: ['#011a28', '#013a40', '#014760'],
      overlay:  'radial-gradient(circle at 30% 20%, rgba(127, 201, 154, 0.08), transparent 60%)',
      glow:     '#7bc99a',
      tint:     'rgba(1, 26, 40, 0.22)',
      mood:     'Sheltered, contemplative.',
    },
    particles:       'rain',
    particleDensity: 0.7,
  },

  // ── Thunderstorm — abyss with faint lime lightning ───────
  {
    id:          'storm_alert',
    name:        'Storm',
    description: 'Ocean abyss with bioluminescent lightning.',
    match: {
      weatherConditions: ['storm'],
    },
    priority: 60,
    palette: {
      gradient: ['#080f0a', '#010f12', '#012030'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(161, 206, 63, 0.10), transparent 50%)',
      glow:     '#a1ce3f',
      tint:     'rgba(8, 15, 10, 0.32)',
      mood:     'Tension without threat.',
    },
    particles:       'rain',
    particleDensity: 1.0,
  },

  // ── Monsoon — deep forest, soft mist ────────────────────
  {
    id:          'monsoon_calm',
    name:        'Monsoon',
    description: 'Deep forest green — petrichor and mist.',
    match: {
      weatherConditions: ['rain', 'cloudy', 'fog'],
      seasons:           ['monsoon'],
    },
    priority: 70,
    palette: {
      gradient: ['#012a1e', '#013026', '#014760'],
      overlay:  'radial-gradient(circle at 50% 80%, rgba(31, 168, 110, 0.10), transparent 60%)',
      glow:     '#1fa86e',
      tint:     'rgba(1, 42, 30, 0.20)',
      mood:     'Slow down.',
    },
    particles:       'rain',
    particleDensity: 0.5,
  },

  // ── Snow — pale ocean-tinted flakes ──────────────────────
  {
    id:          'winter_snow',
    name:        'Snowfall',
    description: 'Icy ocean blue — quiet flakes over the lagoon.',
    match: {
      weatherConditions: ['snow'],
    },
    priority: 60,
    palette: {
      gradient: ['#021f2e', '#013a50', '#014760'],
      overlay:  'radial-gradient(circle at 40% 30%, rgba(203, 229, 142, 0.10), transparent 55%)',
      glow:     '#cbe58e',
      tint:     'rgba(2, 31, 46, 0.20)',
      mood:     'Stillness.',
    },
    particles:       'snow',
    particleDensity: 0.5,
  },

  // ── Winter clear — midnight lagoon, crisp ────────────────
  {
    id:          'winter_clear',
    name:        'Winter clear',
    description: 'Crisp midnight lagoon with a faint lime horizon.',
    match: {
      seasons: ['winter'],
      tempC:   { max: 18 },
    },
    priority: 30,
    palette: {
      gradient: ['#013040', '#014760', '#01243a'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(161, 206, 63, 0.06), transparent 60%)',
      glow:     '#cbe58e',
      tint:     'rgba(1, 48, 64, 0.14)',
      mood:     'Bright cold.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Fog — ocean floor, reduced visibility ────────────────
  {
    id:          'foggy_morning',
    name:        'Fog',
    description: 'Ocean floor haze — world reduced to shapes.',
    match: {
      weatherConditions: ['fog'],
    },
    priority: 45,
    palette: {
      gradient: ['#02201a', '#012d25', '#013026'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(203, 229, 142, 0.07), transparent 80%)',
      glow:     '#cbe58e',
      tint:     'rgba(2, 32, 26, 0.18)',
      mood:     'Inward.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Heatwave — warm lime over viridian ───────────────────
  {
    id:          'heatwave',
    name:        'Heat',
    description: 'Scorching lime over the deep forest.',
    match: {
      seasons: ['summer'],
      tempC:   { min: 35 },
    },
    priority: 55,
    palette: {
      gradient: ['#1a3a10', '#2d6020', '#a1ce3f'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(203, 229, 142, 0.14), transparent 55%)',
      glow:     '#cbe58e',
      tint:     'rgba(26, 58, 16, 0.14)',
      mood:     'Bright and alive.',
    },
    particles:       'dust',
    particleDensity: 0.3,
  },

  // ── Sunset / dawn — viridian to deep forest gold ─────────
  {
    id:          'sunset_golden',
    name:        'Golden hour',
    description: 'Viridian dusk — ocean catching the last light.',
    match: {
      timePhases: ['dusk', 'early-morning'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 40,
    palette: {
      gradient: ['#0d5c3a', '#107e57', '#1fa86e'],
      overlay:  'radial-gradient(circle at 75% 75%, rgba(203, 229, 142, 0.16), transparent 50%)',
      glow:     '#cbe58e',
      tint:     'rgba(13, 92, 58, 0.16)',
      mood:     'Day softens.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Bright midday — deep forest, lime accent ─────────────
  {
    id:          'clear_bright',
    name:        'Clear bright',
    description: 'Deep ocean forest under open sky.',
    match: {
      timePhases:        ['daylight', 'morning', 'afternoon'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 20,
    palette: {
      gradient: ['#013026', '#014760', '#010f0a'],
      overlay:  'radial-gradient(circle at 30% 25%, rgba(161, 206, 63, 0.09), transparent 55%)',
      glow:     '#a1ce3f',
      tint:     'rgba(161, 206, 63, 0.05)',
      mood:     'Open day.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Evening / night — deep abyss, firefly glow ───────────
  {
    id:          'night_calm',
    name:        'Night calm',
    description: 'Ocean abyss with bioluminescent fireflies.',
    match: {
      timePhases: ['evening', 'night'],
    },
    priority: 25,
    palette: {
      gradient: ['#010f0a', '#012030', '#013026'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(161, 206, 63, 0.07), transparent 60%)',
      glow:     '#a1ce3f',
      tint:     'rgba(1, 15, 10, 0.24)',
      mood:     'Wind down.',
    },
    particles:       'fireflies',
    particleDensity: 0.4,
  },

  // ── Late-night meditative — near pitch-black lagoon ───────
  {
    id:          'late_night_meditative',
    name:        'Late night',
    description: 'Hush — deep beneath the ocean surface.',
    match: {
      timePhases: ['night'],
    },
    priority: 24,
    palette: {
      gradient: ['#010809', '#010f0a', '#012018'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(31, 168, 110, 0.05), transparent 70%)',
      glow:     '#1fa86e',
      tint:     'rgba(1, 8, 9, 0.22)',
      mood:     'Hush.',
    },
    particles:       'fireflies',
    particleDensity: 0.2,
  },
];

export const FALLBACK_PRESET: ThemePreset = PRESETS.find((p) => p.id === 'clear_bright')!;
