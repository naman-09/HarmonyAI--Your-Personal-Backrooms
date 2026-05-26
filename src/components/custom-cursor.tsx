'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * NEBULA custom cursor.
 *
 * Two-layer design:
 *   · Inner dot  — 8 px solid lime, follows cursor exactly (rAF)
 *   · Outer ring — 32 px translucent ring, lags behind (lerp)
 *
 * The outer ring expands + fills on hover over interactive elements,
 * and collapses on mouse-down. CSS classes are toggled on the <html>
 * element so the global `cursor: none` keeps the native cursor hidden.
 *
 * Disabled on touch devices (hover media query not available there).
 */
export function CustomCursor() {
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);

  // Track ring position with lerp for smooth trailing
  const ringPos  = useRef({ x: -100, y: -100 });
  const mousePos = useRef({ x: -100, y: -100 });
  const rafId    = useRef<number>();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only activate on pointer-capable devices
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

    setVisible(true);

    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // ── Mouse move ───────────────────────────────────────────
    function onMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
      // Inner dot: instant
      dot!.style.left = e.clientX + 'px';
      dot!.style.top  = e.clientY + 'px';
    }

    // ── Hover detection on interactive elements ──────────────
    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, [tabindex]';

    function onOver(e: MouseEvent) {
      if ((e.target as Element)?.closest(INTERACTIVE)) {
        document.documentElement.classList.add('cursor-hovering');
      }
    }
    function onOut(e: MouseEvent) {
      if ((e.target as Element)?.closest(INTERACTIVE)) {
        document.documentElement.classList.remove('cursor-hovering');
      }
    }

    // ── Click feedback ───────────────────────────────────────
    function onDown() { document.documentElement.classList.add('cursor-clicking'); }
    function onUp()   { document.documentElement.classList.remove('cursor-clicking'); }

    // ── Visibility ───────────────────────────────────────────
    function onEnter() {
      dot!.style.opacity  = '1';
      ring!.style.opacity = '1';
    }
    function onLeave() {
      dot!.style.opacity  = '0';
      ring!.style.opacity = '0';
      document.documentElement.classList.remove('cursor-hovering', 'cursor-clicking');
    }

    // ── Lerp loop for outer ring ─────────────────────────────
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function animate() {
      ringPos.current.x = lerp(ringPos.current.x, mousePos.current.x, 0.14);
      ringPos.current.y = lerp(ringPos.current.y, mousePos.current.y, 0.14);
      ring!.style.left = ringPos.current.x + 'px';
      ring!.style.top  = ringPos.current.y + 'px';
      rafId.current = requestAnimationFrame(animate);
    }
    rafId.current = requestAnimationFrame(animate);

    document.addEventListener('mousemove',   onMove);
    document.addEventListener('mouseover',   onOver);
    document.addEventListener('mouseout',    onOut);
    document.addEventListener('mousedown',   onDown);
    document.addEventListener('mouseup',     onUp);
    document.addEventListener('mouseenter',  onEnter);
    document.addEventListener('mouseleave',  onLeave);

    return () => {
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseover',  onOver);
      document.removeEventListener('mouseout',   onOut);
      document.removeEventListener('mousedown',  onDown);
      document.removeEventListener('mouseup',    onUp);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      document.documentElement.classList.remove('cursor-hovering', 'cursor-clicking');
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Inner dot — instant follow */}
      <div
        ref={dotRef}
        className="cursor-dot cursor-dot-inner"
        style={{ left: -100, top: -100, opacity: 0 }}
        aria-hidden
      />
      {/* Outer ring — lerp follow */}
      <div
        ref={ringRef}
        className="cursor-dot cursor-dot-outer"
        style={{ left: -100, top: -100, opacity: 0 }}
        aria-hidden
      />
    </>
  );
}
