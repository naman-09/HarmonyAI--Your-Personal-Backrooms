// ─── Types ────────────────────────────────────────────────────
export interface EmotionSignals {
  voicePitch: number;      // Hz — raw from Web Audio API
  voiceVolume: number;     // 0–100 RMS-derived
  faceAnger: number;       // 0–1 from face-api.js
  textSentiment: number;   // 0–1 (1 = most distressed), pre-computed
  faceAvailable: boolean;  // false if camera off or models not loaded
}

export interface EmotionScore {
  rage: number;  // 0–1
  calm: number;  // 0–1
  label: 'calm' | 'unsettled' | 'distressed' | 'intense';
  displayValue: number; // 1–10 for UI
}

// ─── Calibration constants ────────────────────────────────────
// Typical adult speech: pitch 100–300 Hz, volume peaks ~70–80
const MAX_PITCH  = 400;
const MAX_VOLUME = 90;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// ─── Scoring function ─────────────────────────────────────────
// Weights derived from multimodal emotion detection literature.
// Text is primary signal; face/voice are corroborating.
// When face is unavailable, weight is redistributed to text.
export function scoreEmotion(signals: EmotionSignals): EmotionScore {
  const voiceStress = clamp(signals.voicePitch  / MAX_PITCH,  0, 1);
  const voiceVol    = clamp(signals.voiceVolume / MAX_VOLUME, 0, 1);
  const faceAnger   = clamp(signals.faceAnger,   0, 1);
  const textScore   = clamp(signals.textSentiment, 0, 1);

  let rage: number;

  if (signals.faceAvailable) {
    rage =
      textScore   * 0.45 +
      faceAnger   * 0.25 +
      voiceStress * 0.15 +
      voiceVol    * 0.15;
  } else {
    // Face unavailable — redistribute 0.25 to text
    rage =
      textScore   * 0.70 +
      voiceStress * 0.15 +
      voiceVol    * 0.15;
  }

  const calm         = 1 - rage;
  const displayValue = Math.round(rage * 9 + 1); // 1–10 scale
  const label: EmotionScore['label'] =
    rage < 0.25 ? 'calm'      :
    rage < 0.50 ? 'unsettled' :
    rage < 0.75 ? 'distressed': 'intense';

  return { rage, calm, label, displayValue };
}
