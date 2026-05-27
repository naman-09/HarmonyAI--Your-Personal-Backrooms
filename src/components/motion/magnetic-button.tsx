'use client';

/**
 * ─── MagneticButton ───────────────────────────────────────────────
 * A wrapper that makes its child subtly follow the cursor —
 * giving a premium "magnetic" feel on hover.
 *
 * Kept intentionally subtle (max 8px shift) so it never feels
 * disorienting in a wellness context.
 * ──────────────────────────────────────────────────────────────────
 */

import { useRef, type MouseEvent } from 'react';
import { motion, useSpring, useReducedMotion } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number; // 0–1 how strong the pull is, default 0.35
}

export function MagneticButton({ children, className, strength = 0.35 }: MagneticButtonProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const x = useSpring(0, { stiffness: 400, damping: 28 });
  const y = useSpring(0, { stiffness: 400, damping: 28 });

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    x.set(dx);
    y.set(dy);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, willChange: 'transform', display: 'inline-flex' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

// ── Press feedback wrapper ────────────────────────────────────────
/** Adds a subtle scale-down on click — for any button/card */
export function PressScale({
  children,
  className,
  scale = 0.96,
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileTap={prefersReduced ? undefined : { scale, transition: { duration: 0.08 } }}
      style={{ display: 'contents' }}
    >
      {children}
    </motion.div>
  );
}
