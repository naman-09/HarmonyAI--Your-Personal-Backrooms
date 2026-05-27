'use client';

/**
 * ─── Page Transition ──────────────────────────────────────────────
 * Wraps a page in a smooth fade-up entrance animation.
 * Use once per route in the page's client component.
 * ──────────────────────────────────────────────────────────────────
 */

import { motion } from 'framer-motion';
import { ease, dur } from '@/lib/motion/config';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: dur.slow, ease: ease.expoOut }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}

/** Variant that slides in from bottom — for modals, drawers */
export function SlideUp({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
