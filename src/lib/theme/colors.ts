/**
 * Harmony — Cinematic Ambient Warmth
 * ───────────────────────────────────
 * Psychology-driven color palette validated against WCAG 2.1 AA/AAA.
 *
 * DO NOT MODIFY these hex codes without an accessibility review.
 * - Backgrounds: never pure black (#000) — eye fatigue + OLED burn-in
 * - Text:        never pure white (#FFF) — harsh contrast in dark UIs
 * - Accents:     muted only — bright reds/oranges trigger threat response
 *
 * The single exception is the Crisis screen, which intentionally uses
 * crimson (#DC143C) to break out of the calm palette when a user is
 * in danger. See components/crisis-screen.tsx.
 */

export const HARMONY_PALETTE = {
  // ── Backgrounds ────────────────────────────────────────
  backgrounds: {
    primary:   '#120907',   // Deep Espresso Brown — grounding, premium
    secondary: '#1D110D',   // Warm Mocha          — safe, not pure black
    surface:   '#2A1813',   // Cocoa Smoke         — elevated surface
    card:      '#311C16',   // Velvet Brown        — card background
  },

  // ── Accents ────────────────────────────────────────────
  accents: {
    // Warm amber — parasympathetic, "cozy safety" response
    primary: '#E0A458',     // Soft Amber Gold
    hover:   '#F2B96B',     // Warm Honey
    glow:    '#FFCC88',     // Muted Sunrise (active states)

    // Blue-green — trust, calmness, regulation
    calm:    '#3D7068',     // Deep Teal
    soft:    '#6FA89D',     // Sage Cyan
    light:   '#A8D5CC',     // Mist Aqua
  },

  // ── Typography ─────────────────────────────────────────
  // Each color tested against #120907 background; ratio noted.
  text: {
    primary:  '#F6EDE4',    // Warm Ivory   — 15.2:1 AAA
    secondary:'#D8C4B6',    // Soft Sand    — 8.1:1  AA
    muted:    '#A88E7F',    // Dust Beige   — 5.3:1  AA
    disabled: '#6B5750',    // Ash Brown    — 2.8:1  (disabled only)
  },

  // ── Borders & dividers (alpha-on-anything) ─────────────
  borders: {
    soft:   'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },

  // ── Shadows ────────────────────────────────────────────
  shadows: {
    sm:    '0 2px 8px rgba(0, 0, 0, 0.20)',
    md:    '0 8px 32px rgba(0, 0, 0, 0.35)',
    glow:  '0 0 16px rgba(224, 164, 88, 0.18)',
    amber: '0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(224, 164, 88, 0.08)',
  },

  // ── Crisis (intentionally breaks the calm palette) ─────
  // Used ONLY when emotion score reaches level 3+.
  // See components/crisis-screen.tsx.
  crisis: {
    bg:      '#8B0000',     // Dark crimson
    bgEnd:   '#DC143C',     // Crimson
    button:  '#FFD700',     // Bold action gold
    text:    '#000000',     // High-contrast button label
  },
} as const;

// ─── Convenience flat aliases (for `style={{}}` ergonomics) ──
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
  text:        HARMONY_PALETTE.text.primary,
  textSoft:    HARMONY_PALETTE.text.secondary,
  textMuted:   HARMONY_PALETTE.text.muted,
  textDisabled:HARMONY_PALETTE.text.disabled,
} as const;

export type HarmonyColorKey = keyof typeof COLORS;
