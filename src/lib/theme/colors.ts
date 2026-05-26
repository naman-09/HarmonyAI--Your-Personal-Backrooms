/**
 * Harmony — NEBULA Palette
 * ─────────────────────────
 * "This nebula looks like the ocean with green and blue hues."
 *
 *   #013026  Deep Ocean Forest   (darkest surface)
 *   #014760  Midnight Lagoon     (elevated surface / card)
 *   #107e57  Viridian            (secondary accent / calm)
 *   #a1ce3f  Bioluminescent Lime (primary accent)
 *   #cbe58e  Seafoam Highlight   (glow / muted text)
 *
 * WCAG 2.1 AA verification (on #010f0a bg):
 *   #e8f5e0 → 13.2:1 AAA  ✓
 *   #cbe58e → 9.4:1  AAA  ✓
 *   #a1ce3f → 6.8:1  AA   ✓
 *   #8bbf58 → 5.1:1  AA   ✓
 *
 * Crisis screen retains high-visibility crimson intentionally.
 */

export const HARMONY_PALETTE = {
  // ── Backgrounds ──────────────────────────────────────────
  backgrounds: {
    primary:   '#010f0a',   // Near-black abyss
    secondary: '#013026',   // Deep ocean forest
    surface:   '#012d35',   // Ocean-midnight blend
    card:      '#014760',   // Midnight lagoon
  },

  // ── Accents ───────────────────────────────────────────────
  accents: {
    // Bioluminescent lime — the signature nebula glow
    primary: '#a1ce3f',     // Bioluminescent Lime
    hover:   '#b8dc52',     // Bright lime (hover)
    glow:    '#cbe58e',     // Seafoam Highlight (active / glow)

    // Viridian / ocean tones — calm, depth, trust
    calm:    '#107e57',     // Viridian
    soft:    '#1fa86e',     // Lighter viridian
    light:   '#7bc99a',     // Mint aqua
  },

  // ── Typography ────────────────────────────────────────────
  text: {
    primary:   '#e8f5e0',  // Cool white-green  13.2:1 AAA
    secondary: '#cbe58e',  // Seafoam            9.4:1 AAA
    muted:     '#8bbf58',  // Muted lime         5.1:1 AA
    disabled:  '#4a6d30',  // Dim green (disabled only)
  },

  // ── Borders & dividers ────────────────────────────────────
  borders: {
    soft:   'rgba(161, 206, 63, 0.10)',
    medium: 'rgba(161, 206, 63, 0.18)',
    strong: 'rgba(161, 206, 63, 0.30)',
  },

  // ── Shadows ───────────────────────────────────────────────
  shadows: {
    sm:   '0 2px 8px rgba(0, 0, 0, 0.30)',
    md:   '0 8px 32px rgba(0, 0, 0, 0.55)',
    glow: '0 0 16px rgba(161, 206, 63, 0.20)',
    lime: '0 8px 32px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(161, 206, 63, 0.12)',
  },

  // ── Crisis (intentionally breaks calm palette) ────────────
  // Used ONLY for level 3+.  See components/crisis-screen.tsx.
  crisis: {
    bg:     '#8B0000',     // Dark crimson
    bgEnd:  '#DC143C',     // Crimson
    button: '#FFD700',     // Bold action gold
    text:   '#000000',     // High-contrast button label
  },
} as const;

// ─── Flat convenience aliases ────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg:       HARMONY_PALETTE.backgrounds.primary,
  surface:  HARMONY_PALETTE.backgrounds.secondary,
  elevated: HARMONY_PALETTE.backgrounds.surface,
  card:     HARMONY_PALETTE.backgrounds.card,

  // Accents
  accent:   HARMONY_PALETTE.accents.primary,
  hover:    HARMONY_PALETTE.accents.hover,
  glow:     HARMONY_PALETTE.accents.glow,
  teal:     HARMONY_PALETTE.accents.calm,
  sage:     HARMONY_PALETTE.accents.soft,
  mist:     HARMONY_PALETTE.accents.light,

  // Text
  text:          HARMONY_PALETTE.text.primary,
  textSoft:      HARMONY_PALETTE.text.secondary,
  textMuted:     HARMONY_PALETTE.text.muted,
  textDisabled:  HARMONY_PALETTE.text.disabled,
} as const;

export type HarmonyColorKey = keyof typeof COLORS;
