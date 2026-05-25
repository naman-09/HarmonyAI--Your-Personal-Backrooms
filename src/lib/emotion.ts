// ─── Types ────────────────────────────────────────────────────
export interface EmotionSignals {
  // Voice signals
  voicePitch:   number;      // Hz — raw from Web Audio API
  voiceVolume:  number;      // 0–100 RMS-derived

  // Text
  textSentiment: number;     // 0–1 (1 = most distressed), pre-computed

  // Face expression net scores (0–1 each)
  faceAnger:     number;
  faceSad:       number;
  faceHappy:     number;
  faceSurprised: number;
  faceDisgusted: number;
  faceFearful:   number;
  faceNeutral:   number;

  // Geometric landmark signals (0–1 each)
  eyeOpenness:   number;     // wide eyes → fear / surprise
  browRaise:     number;     // raised brows → concern
  mouthOpen:     number;     // open mouth → distress / surprise

  faceAvailable: boolean;    // false if camera off or models not loaded
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
  const textScore   = clamp(signals.textSentiment, 0, 1);

  // Combined face distress: anger+sad+fearful+disgusted, minus happy
  const faceDistress = clamp(
    signals.faceAnger     * 0.35 +
    signals.faceSad       * 0.25 +
    signals.faceFearful   * 0.20 +
    signals.faceDisgusted * 0.10 +
    signals.faceSurprised * 0.05 +  // mild concern
    signals.eyeOpenness   * 0.15 +  // wide eyes = fear
    signals.browRaise     * 0.10 +  // raised brows = concern
    signals.mouthOpen     * 0.05 -  // open mouth alone less diagnostic
    signals.faceHappy     * 0.30,   // happiness reduces score
    0, 1
  );

  let rage: number;

  if (signals.faceAvailable) {
    rage =
      textScore   * 0.40 +
      faceDistress * 0.35 +
      voiceStress * 0.13 +
      voiceVol    * 0.12;
  } else {
    // Face unavailable — redistribute face weight to text
    rage =
      textScore   * 0.70 +
      voiceStress * 0.15 +
      voiceVol    * 0.15;
  }

  rage = clamp(rage, 0, 1);
  const calm         = 1 - rage;
  const displayValue = Math.round(rage * 9 + 1); // 1–10 scale
  const label: EmotionScore['label'] =
    rage < 0.25 ? 'calm'      :
    rage < 0.50 ? 'unsettled' :
    rage < 0.75 ? 'distressed': 'intense';

  return { rage, calm, label, displayValue };
}

// ─── Human-readable emotion summary for AI context ───────────
// Called by ai.ts to include a concise description in the model prompt.
export function describeEmotionSignals(sig: EmotionSignals): string {
  if (!sig.faceAvailable && sig.voiceVolume < 5 && sig.voicePitch < 50) {
    return 'No multimodal signals detected (camera and mic off).';
  }

  const parts: string[] = [];

  // Text
  if (sig.textSentiment > 0.6)      parts.push(`text sentiment: distressed (${(sig.textSentiment * 100).toFixed(0)}%)`);
  else if (sig.textSentiment > 0.3)  parts.push(`text sentiment: mild distress`);
  else                               parts.push(`text sentiment: calm`);

  // Face
  if (sig.faceAvailable) {
    const top = [
      { k: 'angry',     v: sig.faceAnger },
      { k: 'sad',       v: sig.faceSad },
      { k: 'fearful',   v: sig.faceFearful },
      { k: 'surprised', v: sig.faceSurprised },
      { k: 'happy',     v: sig.faceHappy },
      { k: 'disgusted', v: sig.faceDisgusted },
      { k: 'neutral',   v: sig.faceNeutral },
    ].sort((a, b) => b.v - a.v).slice(0, 2);
    parts.push(`facial expression: ${top.map(t => `${t.k} ${(t.v * 100).toFixed(0)}%`).join(', ')}`);

    const geo: string[] = [];
    if (sig.eyeOpenness > 0.6) geo.push('wide eyes');
    if (sig.browRaise > 0.7)   geo.push('raised brows');
    if (sig.mouthOpen > 0.5)   geo.push('open mouth');
    if (geo.length > 0) parts.push(`face geometry: ${geo.join(', ')}`);
  }

  // Voice
  if (sig.voiceVolume > 10) {
    parts.push(`voice: vol ${sig.voiceVolume.toFixed(0)}/100, pitch ${sig.voicePitch.toFixed(0)} Hz`);
  }

  return parts.join(' | ');
}
