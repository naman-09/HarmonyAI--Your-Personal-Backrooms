// ─── 11 theme presets keyed to (time × weather × season) ────
// Hex codes match the Cinematic Ambient Warmth psychology palette.
// All gradients are de-saturated; warm browns + cool teals for calm.

import type { ThemePreset } from './types';

export const PRESETS: ThemePreset[] = [
  // ── Cozy rain — soft de-saturated blue → teal ─────────────
  {
    id:          'cozy_rain',
    name:        'Cozy rain',
    description: 'Soft blue-grey, gentle teal — sheltered and quiet.',
    match: {
      weatherConditions: ['rain'],
    },
    priority: 50,
    palette: {
      gradient: ['#2D4059', '#345766', '#3D7068'],
      overlay:  'radial-gradient(circle at 30% 20%, rgba(168, 213, 204, 0.08), transparent 60%)',
      glow:     '#A8D5CC',
      tint:     'rgba(45, 64, 89, 0.20)',
      mood:     'Sheltered, contemplative.',
    },
    particles:       'rain',
    particleDensity: 0.7,
  },

  // ── Thunderstorm — charcoal → slate with muted lavender accent ──
  {
    id:          'storm_alert',
    name:        'Storm',
    description: 'Dramatic ambience with muted lavender lightning.',
    match: {
      weatherConditions: ['storm'],
    },
    priority: 60,
    palette: {
      gradient: ['#232931', '#2E343E', '#393E46'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(184, 198, 255, 0.12), transparent 50%)',
      glow:     '#B8C6FF',
      tint:     'rgba(35, 41, 49, 0.30)',
      mood:     'Tension without threat.',
    },
    particles:       'rain',
    particleDensity: 1.0,
  },

  // ── Monsoon (Jul–Sep + rain/clouds/fog) ───────────────────
  {
    id:          'monsoon_calm',
    name:        'Monsoon',
    description: 'Deep teal, soft mist — petrichor weather.',
    match: {
      weatherConditions: ['rain', 'cloudy', 'fog'],
      seasons:           ['monsoon'],
    },
    priority: 70,
    palette: {
      gradient: ['#1F3A3F', '#2D5358', '#3D7068'],
      overlay:  'radial-gradient(circle at 50% 80%, rgba(168, 213, 204, 0.10), transparent 60%)',
      glow:     '#6FA89D',
      tint:     'rgba(61, 112, 104, 0.18)',
      mood:     'Slow down.',
    },
    particles:       'rain',
    particleDensity: 0.5,
  },

  // ── Snow — pale icy → twilight ────────────────────────────
  {
    id:          'winter_snow',
    name:        'Snowfall',
    description: 'Cool blues, gentle flakes, stillness.',
    match: {
      weatherConditions: ['snow'],
    },
    priority: 60,
    palette: {
      gradient: ['#4A5C70', '#3A4858', '#1E2022'],
      overlay:  'radial-gradient(circle at 40% 30%, rgba(201, 214, 223, 0.16), transparent 55%)',
      glow:     '#C9D6DF',
      tint:     'rgba(82, 97, 107, 0.20)',
      mood:     'Stillness.',
    },
    particles:       'snow',
    particleDensity: 0.5,
  },

  // ── Winter clear (cold, no precipitation) ─────────────────
  {
    id:          'winter_clear',
    name:        'Winter clear',
    description: 'Crisp slate with the smallest hint of warmth.',
    match: {
      seasons: ['winter'],
      tempC:   { max: 18 },
    },
    priority: 30,
    palette: {
      gradient: ['#52616B', '#3A4654', '#1E2022'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(224, 164, 88, 0.05), transparent 60%)',
      glow:     '#C9D6DF',
      tint:     'rgba(82, 97, 107, 0.12)',
      mood:     'Bright cold.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Fog — muted greys, world reduced ──────────────────────
  {
    id:          'foggy_morning',
    name:        'Fog',
    description: 'Soft edges, inward weather.',
    match: {
      weatherConditions: ['fog'],
    },
    priority: 45,
    palette: {
      gradient: ['#3A3C42', '#32343A', '#2A2C30'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(216, 196, 182, 0.10), transparent 80%)',
      glow:     '#D8C4B6',
      tint:     'rgba(58, 60, 66, 0.18)',
      mood:     'Inward.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Heatwave / summer scorch ──────────────────────────────
  {
    id:          'heatwave',
    name:        'Heat',
    description: 'Warm coral and golden peach.',
    match: {
      seasons: ['summer'],
      tempC:   { min: 35 },
    },
    priority: 55,
    palette: {
      gradient: ['#E07A5F', '#E89B6A', '#F2CC8F'],
      overlay:  'radial-gradient(circle at 70% 30%, rgba(255, 204, 136, 0.12), transparent 55%)',
      glow:     '#FFCC88',
      tint:     'rgba(224, 122, 95, 0.12)',
      mood:     'Bright and heavy.',
    },
    particles:       'dust',
    particleDensity: 0.3,
  },

  // ── Sunset / dawn (golden hour) ───────────────────────────
  {
    id:          'sunset_golden',
    name:        'Golden hour',
    description: 'Coral → soft rose. The prettiest light of the day.',
    match: {
      timePhases: ['dusk', 'early-morning'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 40,
    palette: {
      gradient: ['#F08A5D', '#D45D62', '#B83B5E'],
      overlay:  'radial-gradient(circle at 75% 75%, rgba(255, 204, 136, 0.18), transparent 50%)',
      glow:     '#FFCC88',
      tint:     'rgba(240, 138, 93, 0.15)',
      mood:     'Day softens.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Bright midday clear — warm amber over deep espresso ──
  {
    id:          'clear_bright',
    name:        'Clear bright',
    description: 'Warm amber over the cinematic espresso base.',
    match: {
      timePhases:        ['daylight', 'morning', 'afternoon'],
      weatherConditions: ['clear', 'cloudy'],
    },
    priority: 20,
    palette: {
      gradient: ['#1D110D', '#311C16', '#120907'],
      overlay:  'radial-gradient(circle at 30% 25%, rgba(255, 204, 136, 0.10), transparent 55%)',
      glow:     '#E0A458',
      tint:     'rgba(224, 164, 88, 0.06)',
      mood:     'Open day.',
    },
    particles:       'none',
    particleDensity: 0,
  },

  // ── Evening / night — calm depth with safety ──────────────
  {
    id:          'night_calm',
    name:        'Night calm',
    description: 'Deep purple-brown with a quiet moon halo.',
    match: {
      timePhases: ['evening', 'night'],
    },
    priority: 25,
    palette: {
      gradient: ['#1B1325', '#251A35', '#2A1813'],
      overlay:  'radial-gradient(circle at 80% 20%, rgba(255, 204, 136, 0.08), transparent 60%)',
      glow:     '#FFCC88',
      tint:     'rgba(27, 19, 37, 0.22)',
      mood:     'Wind down.',
    },
    particles:       'fireflies',
    particleDensity: 0.4,
  },

  // ── Late-night meditative — near-black with faint glow ────
  {
    id:          'late_night_meditative',
    name:        'Late night',
    description: 'For the small hours. Hush.',
    match: {
      timePhases: ['night'],
    },
    priority: 24,
    palette: {
      gradient: ['#0A0612', '#120907', '#1B1325'],
      overlay:  'radial-gradient(circle at 50% 50%, rgba(168, 213, 204, 0.06), transparent 70%)',
      glow:     '#A8D5CC',
      tint:     'rgba(10, 6, 18, 0.20)',
      mood:     'Hush.',
    },
    particles:       'fireflies',
    particleDensity: 0.2,
  },
];

/** Fallback if scoring matches nothing (safety net). */
export const FALLBACK_PRESET: ThemePreset = PRESETS.find((p) => p.id === 'clear_bright')!;
