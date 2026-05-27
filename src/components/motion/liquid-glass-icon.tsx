'use client';

/**
 * ─── LiquidGlassIcon ─────────────────────────────────────────────
 *
 * iOS 26-accurate glass wrapper for nav icons and action buttons.
 *
 * Visual layers (bottom → top):
 *   1. Backdrop warp     — SVG feDisplacementMap + feTurbulence refracts
 *                          whatever's behind the element (lensing)
 *   2. Frosted core      — backdrop-filter: blur + saturate + brightness
 *   3. Specular layer    — ::before: top-left gradient glare
 *                          (like sunlight striking curved glass)
 *   4. Rim glow          — ::after: inset border highlights, depth shadow
 *   5. Content           — icon / text sits above all glass layers
 *
 * Water droplet behavior:
 *   - Idle:  organic border-radius breathing (morphing blob keyframe)
 *   - Hover: brightens specular + lifts (y: -2px)
 *   - Press: pinch compress (scaleY 0.90) then spring back — like
 *             pressing a real water balloon
 *
 * ──────────────────────────────────────────────────────────────────
 */

import { useRef, type MouseEvent } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';

// ── Sizes ──────────────────────────────────────────────────────────
type GlassSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<GlassSize, { w: number; h: number; r: number; blur: number }> = {
  xs: { w: 28, h: 28, r: 8,  blur: 10 },
  sm: { w: 36, h: 36, r: 10, blur: 14 },
  md: { w: 44, h: 44, r: 14, blur: 18 },
  lg: { w: 56, h: 56, r: 18, blur: 22 },
};

// ── Variant presets ─────────────────────────────────────────────────
type GlassVariant = 'default' | 'active' | 'accent' | 'danger';

const VARIANT_STYLES: Record<GlassVariant, {
  bg: string; border: string; specular: string; glow: string;
}> = {
  default: {
    bg:       'rgba(255,255,255,0.08)',
    border:   'rgba(255,255,255,0.22)',
    specular: 'rgba(255,255,255,0.32)',
    glow:     'rgba(255,255,255,0.04)',
  },
  active: {
    bg:       'rgba(161,206,63,0.14)',
    border:   'rgba(161,206,63,0.35)',
    specular: 'rgba(255,255,255,0.40)',
    glow:     'rgba(161,206,63,0.12)',
  },
  accent: {
    bg:       'rgba(161,206,63,0.18)',
    border:   'rgba(161,206,63,0.40)',
    specular: 'rgba(255,255,255,0.45)',
    glow:     'rgba(161,206,63,0.18)',
  },
  danger: {
    bg:       'rgba(224,122,63,0.14)',
    border:   'rgba(224,122,63,0.35)',
    specular: 'rgba(255,255,255,0.35)',
    glow:     'rgba(224,122,63,0.10)',
  },
};

// ── Props ────────────────────────────────────────────────────────────
interface LiquidGlassIconProps {
  children:    React.ReactNode;
  size?:       GlassSize;
  variant?:    GlassVariant;
  active?:     boolean;
  /** Make it pill-shaped (wide) instead of square */
  pill?:       boolean;
  pillWidth?:  number;
  /** Whether to apply the water-droplet blob animation */
  blob?:       boolean;
  /** Whether to apply chromatic aberration filter */
  chroma?:     boolean;
  className?:  string;
  onClick?:    () => void;
  title?:      string;
  disabled?:   boolean;
  as?:         'button' | 'div';
}

export function LiquidGlassIcon({
  children,
  size = 'sm',
  variant,
  active = false,
  pill = false,
  pillWidth,
  blob = true,
  chroma = false,
  className,
  onClick,
  title,
  disabled,
  as: Tag = 'button',
}: LiquidGlassIconProps) {
  const { glassMode } = useTheme();
  const prefersReduced = useReducedMotion();
  const isGlass = glassMode;
  const ref = useRef<HTMLDivElement>(null);

  // Resolve variant
  const resolvedVariant: GlassVariant = variant ?? (active ? 'active' : 'default');
  const v = VARIANT_STYLES[resolvedVariant];
  const s = SIZE[size];

  // Magnetic tilt springs (cursor-aware glass tilt effect)
  const rotX = useSpring(0, { stiffness: 400, damping: 30 });
  const rotY = useSpring(0, { stiffness: 400, damping: 30 });

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!isGlass || prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width  / 2) / (width  / 2);  // -1 to 1
    const y = (e.clientY - top  - height / 2) / (height / 2);
    rotX.set(-y * 8);   // tilt up/down max 8°
    rotY.set( x * 8);   // tilt left/right
  }

  function onMouseLeave() {
    rotX.set(0);
    rotY.set(0);
  }

  // If not in liquid-glass mode, render a transparent passthrough.
  // Always use a <div display:contents> — never a <button> — so we
  // never produce an invalid nested <button><button> DOM structure
  // (which causes React hydration errors when used inside motion.button).
  if (!isGlass) {
    return (
      <div className={className} style={{ display: 'contents' }}>
        {children}
      </div>
    );
  }

  const width  = pill ? (pillWidth ?? 120) : s.w;
  const height = s.h;
  const radius = pill ? s.h / 2 : s.r;

  // iOS 26 backdrop filter: SVG refraction + blur + color correction
  const bdf = [
    `url(#lg-refract-sm)`,          // refraction warp (Chromium only)
    `blur(${s.blur}px)`,             // frosted core
    `saturate(1.9)`,                 // pump color vibrancy
    `brightness(1.08)`,              // slight lift
  ].join(' ');

  return (
    <motion.div
      ref={ref}
      className={`lg-icon-wrap ${blob ? 'lg-blob' : ''} ${chroma ? 'lg-chroma' : ''} ${className ?? ''}`}
      style={{
        width,
        height,
        borderRadius: radius,
        '--lg-bg':       v.bg,
        '--lg-border':   v.border,
        '--lg-specular': v.specular,
        '--lg-glow':     v.glow,
        '--lg-blur':     `${s.blur}px`,
        '--lg-bdf':      bdf,
        '--lg-radius':   `${radius}px`,
        rotateX: prefersReduced ? 0 : rotX,
        rotateY: prefersReduced ? 0 : rotY,
        transformStyle: 'preserve-3d',
        perspective: '800px',
      } as React.CSSProperties}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title={title}
      whileHover={prefersReduced ? undefined : {
        scale:  1.06,
        y:      -2,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      }}
      whileTap={prefersReduced ? undefined : {
        scaleX:  1.08,
        scaleY:  0.88,
        transition: { type: 'spring', stiffness: 600, damping: 18, duration: 0.08 },
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-disabled={disabled}
    >
      {/* Content sits above the glass layers */}
      <span className="lg-icon-content" style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {children}
      </span>

      {/* CSS handles ::before (specular) and ::after (rim) */}
    </motion.div>
  );
}

// ── Pill-shaped glass button (for CTA / New Chat) ──────────────────
interface LiquidGlassPillProps {
  children:   React.ReactNode;
  onClick?:   () => void;
  disabled?:  boolean;
  className?: string;
  accent?:    boolean;
  title?:     string;
}

export function LiquidGlassPill({ children, onClick, disabled, className, accent, title }: LiquidGlassPillProps) {
  return (
    <LiquidGlassIcon
      size="sm"
      variant={accent ? 'accent' : 'default'}
      pill
      blob={false}
      className={className}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      as="button"
    >
      {children}
    </LiquidGlassIcon>
  );
}
