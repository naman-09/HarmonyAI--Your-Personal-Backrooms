'use client';

/**
 * ─── Lenis Smooth Scroll Provider ────────────────────────────────
 * Wraps the app with buttery-smooth momentum scrolling.
 * Respects prefers-reduced-motion.
 * ──────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import Lenis from 'lenis';

let globalLenis: Lenis | null = null;

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Respect user's reduced-motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    globalLenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      globalLenis = null;
    };
  }, []);

  return <>{children}</>;
}

/** Programmatically scroll to an element */
export function scrollTo(target: string | HTMLElement, options?: { offset?: number; duration?: number }) {
  globalLenis?.scrollTo(target, options);
}
