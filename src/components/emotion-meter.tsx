'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { EmotionScore } from '@/lib/emotion';
import { HARMONY_PALETTE } from '@/lib/theme/colors';

interface EmotionMeterProps {
  score: EmotionScore;
  size?: number;
}

// Psychology-driven mapping: warm amber escalation, never bright red.
// Bright red triggers fight-or-flight; this app's job is the opposite.
// Colors align with --emo-* tokens in globals.css and the NEBULA palette.
const LABEL_COLOR: Record<EmotionScore['label'], string> = {
  calm:       '#107e57',   // viridian       — grounded, present
  unsettled:  '#1fa86e',   // lighter viridian — gently elevated
  distressed: '#a1ce3f',   // bioluminescent lime — notable but not alarming
  intense:    '#e07a3f',   // warm amber      — never bright red
};

const LABEL_GLOW: Record<EmotionScore['label'], string> = {
  calm:       'rgba(16, 126, 87, 0.30)',
  unsettled:  'rgba(31, 168, 110, 0.30)',
  distressed: 'rgba(161, 206, 63, 0.32)',
  intense:    'rgba(224, 122, 63, 0.38)',
};

const LABEL_TEXT: Record<EmotionScore['label'], string> = {
  calm:       'Calm',
  unsettled:  'Unsettled',
  distressed: 'Distressed',
  intense:    'Intense',
};

export function EmotionMeter({ score, size = 96 }: EmotionMeterProps) {
  const color   = LABEL_COLOR[score.label];
  const glow    = LABEL_GLOW[score.label];
  const r       = (size / 2) - 6;
  const circ    = 2 * Math.PI * r;
  const filled  = circ * score.rage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Background ring */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={5}
          />
        </svg>

        {/* Animated progress ring */}
        <svg
          width={size} height={size}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: circ - filled }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
            style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
          />
        </svg>

        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.span
            key={score.displayValue}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ fontSize: size * 0.27, fontWeight: 500, color, lineHeight: 1 }}
          >
            {score.displayValue}
          </motion.span>
          <span style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>/ 10</span>
        </div>
      </div>

      {/* Label */}
      <AnimatePresence mode="wait">
        <motion.span
          key={score.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          style={{ fontSize: 12, color, fontWeight: 500 }}
        >
          {LABEL_TEXT[score.label]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
