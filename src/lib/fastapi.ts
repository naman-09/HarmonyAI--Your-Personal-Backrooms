/**
 * Harmony FastAPI sidecar client.
 *
 * All functions fall back to the local TypeScript implementations when
 * FASTAPI_BASE_URL is not set or the sidecar is unreachable — the app
 * always works without the Python service.
 *
 * Env is read at call-time (not module level) so dev hot-reload picks
 * up changes to .env.local without restarting the Next.js server.
 */

import { scoreEmotion, type EmotionScore, type EmotionSignals } from './emotion';
import { safetyCheck as localSafetyCheck, type RiskAssessment } from './safety';

function getBase(): string | null {
  return process.env.FASTAPI_BASE_URL ?? null;
}

const TIMEOUT_MS = 2_500;

// ── Emotion scoring ──────────────────────────────────────────────
export async function scoreEmotionWithFastAPI(
  signals: EmotionSignals
): Promise<EmotionScore> {
  const base = getBase();
  if (!base) return scoreEmotion(signals);

  try {
    const res = await fetch(`${base}/api/v1/emotion/score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(signals),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return scoreEmotion(signals);

    const data = (await res.json()) as EmotionScore;
    if (
      typeof data.rage         !== 'number' ||
      typeof data.calm         !== 'number' ||
      typeof data.displayValue !== 'number'
    ) {
      return scoreEmotion(signals);
    }

    return data;
  } catch {
    return scoreEmotion(signals);
  }
}

// ── Safety check (optional FastAPI path) ────────────────────────
// The TypeScript safety check (src/lib/safety.ts) is the authoritative
// implementation — it writes to the DB and handles level-4 escalation.
// This thin wrapper adds the FastAPI path for teams that prefer the
// Python regex engine, but still falls back to local if unavailable.
export async function checkSafetyWithFastAPI(
  text:    string,
  context: { sessionId?: string; userId?: number } = {}
): Promise<RiskAssessment> {
  const base = getBase();

  // Always use the local (DB-writing) implementation — it handles
  // level-4 escalation and audit logging that the sidecar cannot.
  // The FastAPI result is only used for its trigger list when available.
  const localResult = await localSafetyCheck(text, context);

  if (!base || localResult.level === 0) return localResult;

  try {
    const res = await fetch(`${base}/api/v1/safety/check`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return localResult;

    const remote = await res.json() as { level: number; triggers: string[] };
    // Use higher of the two levels; merge triggers for richer audit data
    if (remote.level > localResult.level) {
      return {
        ...localResult,
        level:    remote.level as RiskAssessment['level'],
        triggers: Array.from(new Set([...localResult.triggers, ...remote.triggers])),
      };
    }
    return {
      ...localResult,
      triggers: Array.from(new Set([...localResult.triggers, ...remote.triggers])),
    };
  } catch {
    return localResult;
  }
}

// ── Health check ─────────────────────────────────────────────────
export async function getFastAPIHealth(): Promise<'ok' | 'error' | 'disabled'> {
  const base = getBase();
  if (!base) return 'disabled';

  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
