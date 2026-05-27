/**
 * ─── Harmony Motion System ────────────────────────────────────────
 * Physics-based, GPU-accelerated animation configuration.
 * All values tuned for 60fps on mid-range devices.
 * ──────────────────────────────────────────────────────────────────
 */

// ── Spring presets ─────────────────────────────────────────────
export const spring = {
  /** Smooth settle — for pages, panels, modals */
  smooth: { type: 'spring' as const, stiffness: 280, damping: 32, mass: 1 },
  /** Gentle float — for cards, list items */
  gentle: { type: 'spring' as const, stiffness: 220, damping: 30, mass: 0.9 },
  /** Snappy pop — for buttons, badges, microinteractions */
  snappy: { type: 'spring' as const, stiffness: 480, damping: 28, mass: 0.8 },
  /** Bouncy — for icons, emoji, playful elements */
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 20, mass: 0.75 },
  /** Slow drift — for hero elements, backgrounds */
  drift:  { type: 'spring' as const, stiffness: 120, damping: 24, mass: 1.2 },
} as const;

// ── Cubic-bezier easings ────────────────────────────────────────
export const ease = {
  /** Standard — Material / Apple default */
  out:      [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Entry ease */
  in:       [0.4, 0, 1, 1]   as [number, number, number, number],
  /** iOS spring feel */
  ios:      [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** Linear */
  linear:   [1, 1, 0, 0] as [number, number, number, number],
  /** Smooth — for cross-fades, opacity */
  smooth:   [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Expo out — premium deceleration */
  expoOut:  [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

// ── Duration tokens ────────────────────────────────────────────
export const dur = {
  instant:  0.08,
  fast:     0.14,
  base:     0.22,
  slow:     0.35,
  slower:   0.50,
  crawl:    0.80,
} as const;

// ── Pre-built transition presets ───────────────────────────────
export const transition = {
  /** Page enter/exit */
  page: { duration: dur.slow, ease: ease.expoOut },
  /** Card hover lift */
  card: { duration: dur.base, ease: ease.out },
  /** Button press */
  button: { duration: dur.fast, ease: ease.out },
  /** Modal overlay */
  overlay: { duration: dur.base, ease: ease.smooth },
  /** List item stagger */
  item: { duration: dur.base, ease: ease.expoOut },
} as const;

// ── Variant presets ────────────────────────────────────────────
/** Slide up + fade in — for page content, panels */
export const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring.smooth, delay },
  }),
  exit: { opacity: 0, y: -8, scale: 0.99, transition: { duration: dur.base, ease: ease.out } },
} as const;

/** Fade only — for overlays, subtle reveals */
export const fadeOnly = {
  hidden:  { opacity: 0 },
  visible: (delay = 0) => ({ opacity: 1, transition: { duration: dur.slow, ease: ease.smooth, delay } }),
  exit:    { opacity: 0, transition: { duration: dur.base, ease: ease.out } },
} as const;

/** Scale pop — for modal, dialogs */
export const scalePop = {
  hidden:  { opacity: 0, scale: 0.94, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.smooth },
  exit:    { opacity: 0, scale: 0.96, y: 6, transition: { duration: dur.base, ease: ease.out } },
} as const;

/** Slide in from left — for sidebar */
export const slideLeft = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: spring.smooth },
  exit:    { opacity: 0, x: -20, transition: { duration: dur.base, ease: ease.out } },
} as const;

/** Stagger container */
export const staggerContainer = (stagger = 0.06, delayStart = 0) => ({
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delayStart,
    },
  },
}) as const;

/** Single stagger child */
export const staggerItem = {
  hidden:  { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.gentle,
  },
} as const;

// ── Reduced-motion safe variants ───────────────────────────────
/** Returns either a full variant or an instant one based on preference */
export function respectMotion<T>(full: T, reduced: T, prefersReduced: boolean): T {
  return prefersReduced ? reduced : full;
}
