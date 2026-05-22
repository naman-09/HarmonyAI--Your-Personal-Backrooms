import { db, auditLog, sessions } from './db';
import { flagCrisisSession } from './redis';
import { eq, and } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────
export interface RiskAssessment {
  level:    0 | 1 | 2 | 3 | 4;
  triggers: string[];
  response?: string; // pre-canned response for level 3+ (model never handles these)
}

// ─── Pattern sets ─────────────────────────────────────────────
// A licensed mental health professional should review these before production use.

/** Level 3 — Crisis: suicidal ideation, self-harm, wanting to die */
const LEVEL_3_PATTERNS: RegExp[] = [
  /\b(kill|end|take)\s+(my)?\s*life\b/i,
  /\b(want|thinking|planning)\s+to\s+(die|hurt\s+myself|end\s+it)\b/i,
  /\bsuicid(e|al|ally)\b/i,
  /\bself[- ]harm(ing)?\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\s+anymore\b/i,
  /\b(overdose|od'?ing)\b/i,
  /\b(hang|shoot|jump)\s+(myself|off|from)\b/i,
];

/** Level 2 — Distress: severe hopelessness, breaking down, giving up */
const LEVEL_2_PATTERNS: RegExp[] = [
  /\bcan'?t\s+(go\s+on|take\s+it|do\s+this\s+anymore|hold\s+on)\b/i,
  /\bbreaking\s+down\b/i,
  /\bgiving\s+up\b/i,
  /\bno\s+(reason|point)\s+to\s+(live|continue|keep\s+going)\b/i,
  /\beveryone\s+(would|will)\s+be\s+better\s+without\s+me\b/i,
  /\b(losing|lost)\s+(the\s+)?will\s+to\s+(live|go\s+on)\b/i,
  /\bfall(ing)?\s+apart\b/i,
  /\bcollaps(e|ing)\b/i,
];

/** Level 1 — Elevated: hopelessness, worthlessness, exhaustion */
const LEVEL_1_PATTERNS: RegExp[] = [
  /\bcan'?t\s+(cope|bear|stand)\b/i,
  /\bworthless\b/i,
  /\bhopeless\b/i,
  /\bexhaust(ed|ion)\b/i,
  /\bnumb(ness)?\b/i,
  /\bdesperate\b/i,
  /\bburning?\s*out\b/i,
  /\bso\s+alone\b/i,
  /\bno\s+one\s+(cares|understands)\b/i,
];

// ─── Crisis response copy (level 3+) ─────────────────────────
const CRISIS_RESPONSE = `I'm really glad you reached out, and I want you to know that what you're feeling matters deeply. 💙

Please talk to someone right now — they're trained to help and they want to hear from you:

• **iCall (TISS):** 9152987821 — Mon–Sat, 8am–10pm
• **Vandrevala Foundation:** 1860-2662-345 — 24/7, free, multilingual
• **Emergency:** 112

I've let someone who cares about you know that you might need support right now.

I'm still here with you. You are not alone.`;

// ─── Main safety check ────────────────────────────────────────
export async function safetyCheck(
  text: string,
  context?: { sessionId?: string; userId?: number }
): Promise<RiskAssessment> {
  const triggers: string[] = [];

  // ── Level 3 check ─────────────────────────────────────────
  for (const pattern of LEVEL_3_PATTERNS) {
    if (pattern.test(text)) triggers.push(pattern.source);
  }

  if (triggers.length > 0) {
    let level: 3 | 4 = 3;

    // ── Level 4 escalation: repeated crisis in same session ──
    if (context?.sessionId && context?.userId) {
      try {
        const priorCrises = await db.query.auditLog.findMany({
          where: and(
            eq(auditLog.sessionId, context.sessionId),
            eq(auditLog.event, 'crisis_detected')
          ),
        });
        if (priorCrises.length >= 1) level = 4; // 2nd+ crisis signal = Level 4
      } catch { /* non-blocking — default to level 3 if query fails */ }

      // Log immediately — must not be skipped
      await Promise.allSettled([
        db.insert(auditLog).values({
          sessionId: context.sessionId,
          userId:    context.userId,
          event:     'crisis_detected',
          metadata:  { level, triggers, textLength: text.length },
        }),
        db.update(sessions)
          .set({ riskLevel: 'crisis', crisisLevel: level, isFlagged: true })
          .where(eq(sessions.sessionId, context.sessionId)),
        flagCrisisSession(context.sessionId),
      ]);
    }

    return { level, triggers, response: CRISIS_RESPONSE };
  }

  // ── Level 2 check ─────────────────────────────────────────
  const level2Triggers: string[] = [];
  for (const pattern of LEVEL_2_PATTERNS) {
    if (pattern.test(text)) level2Triggers.push(pattern.source);
  }

  if (level2Triggers.length > 0) {
    if (context?.sessionId && context?.userId) {
      await Promise.allSettled([
        db.insert(auditLog).values({
          sessionId: context.sessionId,
          userId:    context.userId,
          event:     'distress_detected',
          metadata:  { level: 2, triggers: level2Triggers, textLength: text.length },
        }),
        db.update(sessions)
          .set({ riskLevel: 'elevated', crisisLevel: 2 })
          .where(eq(sessions.sessionId, context.sessionId)),
      ]);
    }
    return { level: 2, triggers: level2Triggers };
  }

  // ── Level 1 check ─────────────────────────────────────────
  const level1Triggers: string[] = [];
  for (const pattern of LEVEL_1_PATTERNS) {
    if (pattern.test(text)) level1Triggers.push(pattern.source);
  }

  if (level1Triggers.length > 0) {
    if (context?.sessionId && context?.userId) {
      await db.update(sessions)
        .set({ crisisLevel: 1 })
        .where(eq(sessions.sessionId, context.sessionId));
    }
    return { level: 1, triggers: level1Triggers };
  }

  return { level: 0, triggers: [] };
}
