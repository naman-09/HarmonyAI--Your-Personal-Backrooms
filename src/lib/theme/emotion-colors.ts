/**
 * Emotion-level → color mapping.
 *
 * Used by EmotionMeter, mood journal, sidebar emotion ring, etc.
 * Bucketed into 4 zones (calm / unsettled / distressed / intense) so the
 * color transitions feel meaningful rather than 10 noisy steps.
 *
 * Design principle: warm amber escalates, never bright red.
 * Red triggers fight-or-flight; this app's job is the opposite.
 */

import { HARMONY_PALETTE } from './colors';

export type EmotionBucket = 'calm' | 'unsettled' | 'distressed' | 'intense';

export interface EmotionTone {
  bucket:      EmotionBucket;
  label:       string;
  color:       string;       // primary ring/fill color
  glow:        string;       // halo / soft shadow
  description: string;       // for screen readers + tooltips
}

/** Look up the tone for an emotion level 1–10. */
export function emotionTone(level: number): EmotionTone {
  const n = Math.max(1, Math.min(10, Math.round(level)));

  if (n <= 3) {
    return {
      bucket: 'calm',
      label:  'Calm',
      color:  HARMONY_PALETTE.accents.calm,   // #3D7068
      glow:   'rgba(61, 112, 104, 0.30)',
      description: 'Steady, regulated — feeling settled.',
    };
  }
  if (n <= 6) {
    return {
      bucket: 'unsettled',
      label:  'Unsettled',
      color:  HARMONY_PALETTE.accents.soft,   // #6FA89D
      glow:   'rgba(111, 168, 157, 0.30)',
      description: 'Some friction — manageable but present.',
    };
  }
  if (n <= 8) {
    return {
      bucket: 'distressed',
      label:  'Distressed',
      color:  HARMONY_PALETTE.accents.glow,   // #FFCC88
      glow:   'rgba(255, 204, 136, 0.35)',
      description: 'Real difficulty — worth attending to.',
    };
  }
  return {
    bucket: 'intense',
    label:  'Intense',
    color:  '#D9A066',                        // Warm orange-brown
    glow:   'rgba(217, 160, 102, 0.40)',
    description: 'Heavy moment — Harmony is here with you.',
  };
}

/** Pre-computed 1-10 array for convenience (avoid recomputing in render loops). */
export const EMOTION_TONES: EmotionTone[] = Array.from({ length: 10 }, (_, i) =>
  emotionTone(i + 1),
);

/**
 * The two-color gradient used by the emotion meter background ring.
 * Interpolates calm → intense as the level rises.
 */
export function emotionGradient(level: number): string {
  const tone = emotionTone(level);
  if (tone.bucket === 'calm')       return `linear-gradient(135deg, #3D7068, #6FA89D)`;
  if (tone.bucket === 'unsettled')  return `linear-gradient(135deg, #6FA89D, #A8D5CC)`;
  if (tone.bucket === 'distressed') return `linear-gradient(135deg, #FFCC88, #F2B96B)`;
  return `linear-gradient(135deg, #D9A066, #E0A458)`;
}
