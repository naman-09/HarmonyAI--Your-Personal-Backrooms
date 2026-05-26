/**
 * Cinematic ambient gradients keyed to time-of-day and weather.
 * Used by the ThemedBackground component and any place that
 * needs the same gradient referenced from JS (e.g. inline styles).
 *
 * Hex values match globals.css --gradient-* variables one-for-one.
 */

export const THEME_GRADIENTS = {
  // ── Time of day ────────────────────────────────────────
  morning:   'linear-gradient(135deg, #F6C177, #E0A458)',  // Hopeful peach → amber
  afternoon: 'linear-gradient(135deg, #D9A066, #8F5E3B)',  // Tan → earthy brown
  sunset:    'linear-gradient(135deg, #F08A5D, #B83B5E)',  // Coral → soft rose
  night:     'linear-gradient(135deg, #1B1325, #2A1813)',  // Purple-brown → cocoa
  lateNight: 'linear-gradient(135deg, #0A0612, #1B1325)',  // Almost black, faint purple

  // ── Weather ────────────────────────────────────────────
  rain:      'linear-gradient(135deg, #2D4059, #3D7068)',  // Blue-gray → teal
  storm:     'linear-gradient(135deg, #232931, #393E46)',  // Charcoal → slate
  winter:    'linear-gradient(135deg, #52616B, #1E2022)',  // Cool slate → deep
  summer:    'linear-gradient(135deg, #E07A5F, #F2CC8F)',  // Coral → golden peach
  fog:       'linear-gradient(135deg, #3A3C42, #2A2C30)',  // Muted grey wash
  snow:      'linear-gradient(135deg, #BAD7E8, #4A5C70)',  // Pale icy → twilight

  // ── CTA buttons ────────────────────────────────────────
  cta:       'linear-gradient(135deg, #E0A458, #F2B96B)',  // Primary amber
  ctaHover:  'linear-gradient(135deg, #F2B96B, #FFCC88)',  // Brighter on hover

  // ── Crisis (intentional break — only on Level 3+ screens) ──
  crisis:    'linear-gradient(135deg, #8B0000, #DC143C)',
} as const;

/** Storm has an extra accent (muted lavender lightning). */
export const STORM_LIGHTNING = '#B8C6FF';
/** Winter accent for soft snowflake/highlight. */
export const WINTER_ACCENT  = '#C9D6DF';

export type ThemeGradientKey = keyof typeof THEME_GRADIENTS;
