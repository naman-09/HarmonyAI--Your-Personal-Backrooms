'use client';

/**
 * ─── Liquid Glass SVG Filter Engine ─────────────────────────────
 *
 * Injects reusable SVG filter definitions once at the app root.
 * These power the iOS 26-style glass refraction, goo/metaball merge,
 * and chromatic-aberration effects.
 *
 * iOS 26 Liquid Glass is NOT a background effect — it is applied
 * exclusively to interactive elements (icons, buttons, cards).
 * The background/wallpaper shows THROUGH and is physically distorted
 * (lensed), not just blurred.
 *
 * Web approximation stack:
 *   1. SVG feDisplacementMap  → lensing / refraction warp
 *   2. feTurbulence            → organic water texture noise
 *   3. CSS backdrop-filter     → frosted translucency + saturation boost
 *   4. ::before gradient       → top-left specular highlight (sun on glass)
 *   5. ::after inset shadows   → edge rim glow + depth
 *   6. border-radius keyframes → water droplet organic breathing
 *   7. Framer Motion           → press / hover physics
 *
 * backdrop-filter: url(#filter) works in Chromium only.
 * Safari/Firefox get the CSS-only blur fallback automatically.
 * ──────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';

/** Animates feTurbulence baseFrequency for a living-water feel */
function useTurbulenceAnimation(filterId: string, speed = 0.00012) {
  const rafRef = useRef<number>(0);
  const tRef   = useRef(0);

  useEffect(() => {
    const el = document.querySelector<SVGFETurbulenceElement>(
      `#${filterId} feTurbulence`,
    );
    if (!el) return;

    // Capture non-null reference so the RAF closure stays typed correctly
    const turbEl = el;

    function tick(ts: number) {
      tRef.current = ts;
      // Slowly drift X and Y frequencies in opposite phase → water ripple
      const bfx = (0.012 + Math.sin(ts * speed) * 0.004).toFixed(5);
      const bfy = (0.014 + Math.cos(ts * speed * 0.7) * 0.003).toFixed(5);
      turbEl.setAttribute('baseFrequency', `${bfx} ${bfy}`);
      rafRef.current = requestAnimationFrame(tick);
    }

    // Only animate in dynamic motion mode / when user prefers motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [filterId, speed]);
}

export function LiquidGlassFilter() {
  useTurbulenceAnimation('lg-refract-sm', 0.00010);
  useTurbulenceAnimation('lg-refract-md', 0.00008);

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* ── Small glass element (icons, buttons) ────────────── */}
        <filter
          id="lg-refract-sm"
          x="-20%" y="-20%"
          width="140%" height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/* Organic water-noise — baseFrequency animated by JS */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.014"
            numOctaves="3"
            seed="5"
            result="noise"
          />
          {/* Lens distortion — scale controls refraction strength */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* ── Medium glass element (cards, panels) ────────────── */}
        <filter
          id="lg-refract-md"
          x="-10%" y="-10%"
          width="120%" height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.010 0.013"
            numOctaves="2"
            seed="8"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* ── Goo / metaball merge filter ──────────────────────
            Applies to a container wrapping multiple glass icons.
            Creates the iOS 26 "icons merge into one blob when
            pressed together" liquid effect.                      */}
        <filter id="lg-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 22 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>

        {/* ── Chromatic aberration filter ──────────────────────
            Slight RGB-channel split at edges — the "glass prism"
            fringe you see on real curved glass.                  */}
        <filter id="lg-chroma" x="-5%" y="-5%" width="110%" height="110%">
          {/* Red channel shifted slightly right+up */}
          <feOffset in="SourceGraphic" dx="1.2" dy="-0.8" result="r-shift" />
          <feColorMatrix
            in="r-shift"
            type="matrix"
            values="1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.6 0"
            result="r-channel"
          />
          {/* Blue channel shifted slightly left+down */}
          <feOffset in="SourceGraphic" dx="-1.2" dy="0.8" result="b-shift" />
          <feColorMatrix
            in="b-shift"
            type="matrix"
            values="0 0 0 0 0   0 0 0 0 0   0 0 1 0 0   0 0 0 0.6 0"
            result="b-channel"
          />
          {/* Blend R, source, B together */}
          <feMerge>
            <feMergeNode in="r-channel" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="b-channel" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
