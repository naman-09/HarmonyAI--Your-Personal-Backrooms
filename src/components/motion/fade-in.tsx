'use client';

/**
 * ─── FadeIn / FadeUp ──────────────────────────────────────────────
 * Lightweight wrappers for the most common reveal patterns.
 * Uses IntersectionObserver for scroll-triggered reveals.
 * ──────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring, ease, dur } from '@/lib/motion/config';

interface FadeInProps {
  children:   React.ReactNode;
  className?: string;
  delay?:     number;
  /** 'up' slides from below, 'down' from above, 'none' is opacity only */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in px */
  distance?:  number;
  /** Trigger once or every time it enters viewport */
  once?:      boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 14,
  once = true,
}: FadeInProps) {
  const prefersReduced = useReducedMotion();
  const ref   = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -24px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const hidden = prefersReduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        ...(direction === 'up'    && { y: distance }),
        ...(direction === 'down'  && { y: -distance }),
        ...(direction === 'left'  && { x: distance }),
        ...(direction === 'right' && { x: -distance }),
      };

  const show = prefersReduced
    ? { opacity: 1, transition: { duration: dur.instant } }
    : {
        opacity: 1,
        y: 0,
        x: 0,
        transition: { ...spring.gentle, delay },
      };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={visible ? show : hidden}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger container + child ────────────────────────────────────
interface StaggerProps {
  children:   React.ReactNode;
  className?: string;
  stagger?:   number;
  delay?:     number;
}

export function StaggerGroup({ children, className, stagger = 0.07, delay = 0 }: StaggerProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  {},
        visible: {
          transition: {
            staggerChildren: prefersReduced ? 0 : stagger,
            delayChildren: prefersReduced ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 },
        visible: prefersReduced
          ? { opacity: 1, transition: { duration: dur.instant } }
          : { opacity: 1, y: 0, scale: 1, transition: spring.gentle },
      }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
