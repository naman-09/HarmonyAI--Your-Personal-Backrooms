'use client';

/**
 * ─── AnimatedList ─────────────────────────────────────────────────
 * Stagger-animates list items on mount.
 * Children should use <AnimatedListItem> or plain divs.
 * ──────────────────────────────────────────────────────────────────
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/motion/config';

interface AnimatedListProps {
  children:    React.ReactNode;
  className?:  string;
  stagger?:    number;
  itemKey?:    string; // if items are keyed externally
}

export function AnimatedList({ children, className, stagger = 0.055 }: AnimatedListProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReduced ? 0 : stagger,
            delayChildren: 0,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants = {
  hidden:  { opacity: 0, y: 8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring.gentle },
  exit:    { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.14 } },
};

const reducedVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.08 } },
  exit:    { opacity: 0, transition: { duration: 0.08 } },
};

export function AnimatedListItem({
  children,
  className,
  layoutId,
}: {
  children:   React.ReactNode;
  className?: string;
  layoutId?:  string;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      layoutId={layoutId}
      variants={prefersReduced ? reducedVariants : itemVariants}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}

/** AnimatePresence-wrapped — for items that can be removed */
export function AnimatedListPresence({
  children,
  className,
}: {
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <div className={className}>{children}</div>
    </AnimatePresence>
  );
}
