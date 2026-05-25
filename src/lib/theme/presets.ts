// ─── 11 theme presets keyed to (time × weather × season) ────
// The base latte/terracotta brand stays recognizable; gradients shift
// the mood. All colors chosen with the body text (light cream on dark,
// dark espresso on light) staying legible.

import type { ThemePreset } from './types';

export const PRESETS: ThemePreset[] = [
  // ── Cozy rain — overrides time-of-day when raining ────────
  {
    id:          'cozy_rain',
    name:        'Cozy rain',
    description: 'Indigo wash, soft ripple, a quiet kind of comfort.',
    match: {
      weatherConditions: ['rain'],
    },
    priority: 50,
    palette: {
      gradient: ['#1a1f3a', '#2c2848', '#1a0d2e'],
      overlay:  'radial-gradient(circle at 30% 20%, rgba(120,130,200,0.10), transparent 60%)',
      glow:     '#7c89c4',
      tint:     'rgba(96, 125, 165, 0.18)',
      mood:     'Sheltered, contemplative.',
    },
    particles:       'rain',
    particleDensity: 0.7,
  },

  // ── Thunderstorm ───────────────────────────────────────────
  {
    id:          'storm_alert',
    name:        'Storm',
    description: 'Deep dramatic purple, flashes of light.',
    match: {
      weatherConditions: ['storm'],
    },
    priority: 60,
    palette: {
      gradient: ['#0e0820', '#2a1d45', '#170a2e'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(180,130,255,0.14), transparent 50%)',
      glow:     '#b88dff',
      tint:     'rgba(80, 60, 130, 0.30)',
      mood:     'Intense but contained.',
    },
    particles:       'rain',
    particleDensity: 1.0,
  },

  // ── Monsoon (Jul–Sep + rain) ───────────────────────────────
  {
    id:          'monsoon_calm',
    name:        'Monsoon',
    description: 'Deep teal, soft mist, the season of long rain.',
    match: {
      weatherConditions: ['rain', 'cloudy', 'fog'],
      seasons:           ['monsoon'],
    },
    priority: 70,
    palette: {
      gradient: ['#0e2530', '#13343f', '#091a22'],
      overlay:  'radial-gradient(circle at 50% 80%, rgba(110,180,180,0.10), transparent 60%)',
      glow:     '#76b8b8',
      tint:     'rgba(80, 130, 130, 0.20)',
      mood:     'Petrichor weather. Slow down.',
    },
    particles:       'rain',
    particleDensity: 0.5,
  },

  // ── Snow / winter cold ─────────────────────────────────────
  {
    id:          'winter_snow',
    name:        'Snowfall',
    description: 'Cool blues, gentle flakes, quiet.',
    match: {
      weatherConditions: ['snow'],
    },
    priority: 60,
    palette: {
      gradient: ['#1a2440', '#2a3a5a', '#0e1830'],
      overlay:  'radial-gradient(circle at 40% 30%, rgba(200,220,250,0.12), transparent 55%)',
      glow:     '#c8dcf5',
      tint:     'rgba(186, 219, 240, 0.22)',
      mood:     'Stillness.',
    },
    particles:       'snow',
    particleDensity: 0.5,
  },

  // ── Winter (cold, no precipitation) ────────────────────────
  {
    id:          'winter_clear',
    name:        'Winter clear',
    description: 'Crisp blues with a hint of warmth at the seam.',
    match: {
      seasons: ['winter'],
      tempC:   { max: 18 },
    },
    priority: 30,
    palette: {
      gradient: ['#1a2640', '#2a3258', '#3a2a40'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(255,200,150,0.06), transparent 60%)',
      glow:     '#a8c0e8',
      tint:     'rgba(140, 180, 220, 0.10)',
      mood:     'Bright cold.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Fog ────────────────────────────────────────────────────
  {
    id:          'foggy_morning',
    name:        'Fog',
    description: 'Muted greys, soft edges, world reduced.',
    match: {
      weatherConditions: ['fog'],
    },
    priority: 45,
    palette: {
      gradient: ['#2a2c30', '#3a3c42', '#1a1c20'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(220,220,220,0.10), transparent 80%)',
      glow:     '#c8c8c8',
      tint:     'rgba(180, 180, 180, 0.18)',
      mood:     'Inward weather.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Heatwave / summer scorch ───────────────────────────────
  {
    id:          'heatwave',
    name:        'Heat',
    description: 'Warm amber, slow shimmer.',
    match: {
      seasons: ['summer'],
      tempC:   { min: 35 },
    },
    priority: 55,
    palette: {
      gradient: ['#3a1a0e', '#5a2a1a', '#2a0e08'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(255,180,80,0.10), transparent 55%)',
      glow:     '#ffb45a',
      tint:     'rgba(255, 140, 60, 0.10)',
      mood:     'Bright and heavy.',
    },
    particles:       'dust',
    particleDensity: 0.3,
  },

  // ── Dawn / sunset (golden hour) ────────────────────────────
  {
    id:          'sunset_golden',
    name:        'Golden hour',
    description: 'Pink-orange-violet gradient, the prettiest light of the day.',
    match: {
      timePhases: ['dusk', 'early-morning'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 40,
    palette: {
      gradient: ['#3a1a3e', '#7a2e4a', '#bb5a3a'],
      overlay:  'radial-gradient(circle at 75% 75%, rgba(255,190,120,0.18), transparent 50%)',
      glow:     '#ffb88a',
      tint:     'rgba(255, 138, 91, 0.15)',
      mood:     'Day softens.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Bright midday clear ────────────────────────────────────
  {
    id:          'clear_bright',
    name:        'Clear bright',
    description: 'Warm latte default, sun overhead.',
    match: {
      timePhases:        ['daylight', 'morning', 'afternoon'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 20,
    palette: {
      gradient: ['#2a1a12', '#3a2418', '#1a0d08'],
      overlay:  'radial-gradient(circle at 30% 25%, rgba(255,200,130,0.10), transparent 55%)',
      glow:     '#ffce7e',
      tint:     'rgba(255, 180, 100, 0.06)',
      mood:     'Open day.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Evening calm ───────────────────────────────────────────
  {
    id:          'night_calm',
    name:        'Night calm',
    description: 'Deep indigo with a quiet moon halo.',
    match: {
      timePhases: ['evening', 'night'],
    },
    priority: 25,
    palette: {
      gradient: ['#0e1335', '#1a1f4a', '#0a0820'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(170,180,230,0.10), transparent 60%)',
      glow:     '#c4cbf2',
      tint:     'rgba(60, 70, 130, 0.18)',
      mood:     'Wind down.',
    },
    particles:       'fireflies',
    particleDensity: 0.4,
  },

  // ── Late-night meditative ──────────────────────────────────
  {
    id:          'late_night_meditative',
    name:        'Late night',
    description: 'Near-black with a faint glow — for the small hours.',
    match: {
      // We bucket pre-dawn hours into 'night' for this preset; the engine
      // will treat 22:00–04:00 as late night by checking the hour.
      timePhases: ['night'],
    },
    priority: 24,
    palette: {
      gradient: ['#04060f', '#0a0d1c', '#05060c'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(180,160,255,0.06), transparent 70%)',
      glow:     '#9aa3d8',
      tint:     'rgba(40, 40, 80, 0.18)',
      mood:     'Hush.',
    },
    particles:       'fireflies',
    particleDensity: 0.2,
  },
];

/** Fallback if scoring matches nothing (shouldn't happen, but safe). */
export const FALLBACK_PRESET: ThemePreset = PRESETS.find((p) => p.id === 'clear_bright')!;
