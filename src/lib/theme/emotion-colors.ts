/**
 * Emotion-level → colour mapping — adapted for the NEBULA palette.
 *
 * Scale philosophy (unchanged):
 *   calm       → oceanic teal
 *   unsettled  → mid-lime / seafoam
 *   distressed → bright bioluminescent lime (heightened alertness)
 *   intense    → warm amber-orange (never red — avoids threat response)
 */

import { HARMONY_PALETTE } from './colors';

export type EmotionBucket = 'calm' | 'unsettled' | 'distressed' | 'intense';

export interface EmotionTone {
  bucket:      EmotionBucket;
  label:       string;
  color:       string;
  glow:        string;
  description: string;
}

export function emotionTone(level: number): EmotionTone {
  const n = Math.max(1, Math.min(10, Math.round(level)));

  if (n <= 3) {
    return {
      bucket: 'calm',
      label:  'Calm',
      color:  HARMONY_PALETTE.accents.calm,          // #107e57 Viridian
      glow:   'rgba(16, 126, 87, 0.32)',
      description: 'Steady, regulated — feeling settled.',
    };
  }
  if (n <= 6) {
    return {
      bucket: 'unsettled',
      label:  'Unsettled',
      color:  HARMONY_PALETTE.accents.soft,          // #1fa86e lighter viridian
      glow:   'rgba(31, 168, 110, 0.30)',
      description: 'Some friction — manageable but present.',
    };
  }
  if (n <= 8) {
    return {
      bucket: 'distressed',
      label:  'Distressed',
      color:  HARMONY_PALETTE.accents.primary,       // #a1ce3f bioluminescent lime
      glow:   'rgba(161, 206, 63, 0.38)',
      description: 'Real difficulty — worth attending to.',
    };
  }
  return {
    bucket: 'intense',
    label:  'Intense',
    color:  '#e07a3f',                               // Warm amber-orange — never red
    glow:   'rgba(224, 122, 63, 0.40)',
    description: 'Heavy moment — Harmony is here with you.',
  };
}

export const EMOTION_TONES: EmotionTone[] = Array.from({ length: 10 }, (_, i) =>
  emotionTone(i + 1),
);

export function emotionGradient(level: number): string {
  const tone = emotionTone(level);
  if (tone.bucket === 'calm')       return 'linear-gradient(135deg, #107e57, #1fa86e)';
  if (tone.bucket === 'unsettled')  return 'linear-gradient(135deg, #1fa86e, #7bc99a)';
  if (tone.bucket === 'distressed') return 'linear-gradient(135deg, #a1ce3f, #cbe58e)';
  return 'linear-gradient(135deg, #e07a3f, #d4a052)';
}
