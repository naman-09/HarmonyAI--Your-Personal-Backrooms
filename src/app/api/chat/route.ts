import { NextRequest } from 'next/server';
import { db, sessions, messages } from '@/lib/db';
import { streamHarmonyResponse } from '@/lib/ai';
import { scoreEmotion } from '@/lib/emotion';
import { chatRateLimit } from '@/lib/redis';
import { triggerLevelAlert, getUserAlertSettings } from '@/lib/crisis-alert';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

// Face signal validator — all fields optional so old clients still work
const FaceSignals = z.object({
  faceAnger:     z.number().min(0).max(1).default(0),
  faceSad:       z.number().min(0).max(1).default(0),
  faceHappy:     z.number().min(0).max(1).default(0),
  faceSurprised: z.number().min(0).max(1).default(0),
  faceDisgusted: z.number().min(0).max(1).default(0),
  faceFearful:   z.number().min(0).max(1).default(0),
  faceNeutral:   z.number().min(0).max(1).default(1),
  eyeOpenness:   z.number().min(0).max(1).default(0),
  browRaise:     z.number().min(0).max(1).default(0),
  mouthOpen:     z.number().min(0).max(1).default(0),
  faceAvailable: z.boolean().default(false),
});

const ChatSchema = z.object({
  sessionId:      z.string().uuid(),
  text:           z.string().min(1).max(2000),
  emotionSignals: z.object({
    voicePitch:    z.number().min(0),
    voiceVolume:   z.number().min(0).max(100),
    textSentiment: z.number().min(0).max(1),
  }).merge(FaceSignals),
  history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20),
});

export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const { success } = await chatRateLimit.limit(String(userId));
  if (!success) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body   = await req.json().catch(() => null);
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { sessionId, text, emotionSignals, history } = parsed.data;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });
  if (!session || session.userId !== userId) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const emotionScore = scoreEmotion(emotionSignals);

  await db.insert(messages).values({
    sessionId:    session.id,
    role:         'user',
    content:      text,
    emotionScore: { rage: emotionScore.rage, calm: emotionScore.calm },
    safetyLevel:  0,
  });

  // Parse last known location from session
  let location: { lat: number; lng: number } | undefined;
  try {
    if (session.location) location = JSON.parse(session.location);
  } catch { /* ignore */ }

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

      let assistantContent = '';
      let finalSafetyLevel = 0;

      try {
        for await (const chunk of streamHarmonyResponse({
          text, emotionSignals, history, sessionId, userId,
        })) {
          controller.enqueue(encode(chunk));

          if (chunk.type === 'delta') {
            assistantContent += chunk.text;
          }

          if (chunk.type === 'replace') {
            assistantContent = chunk.text;
          }

          // ── Level 2: distress — AI still responds, we fire SMS in background
          if (chunk.type === 'alert' && chunk.level === 2) {
            finalSafetyLevel = 2;
            // Non-blocking — don't await, don't slow the stream
            getUserAlertSettings(userId).then((s) =>
              triggerLevelAlert(2, sessionId, userId, s, location)
            ).catch(() => { /* logged inside triggerLevelAlert */ });
          }

          // ── Level 3 / 4: crisis — SMS + call, full-screen UI triggered client-side
          if (chunk.type === 'crisis') {
            finalSafetyLevel = chunk.level;

            await Promise.allSettled([
              db.insert(messages).values({
                sessionId:   session.id,
                role:        'assistant',
                content:     chunk.response,
                safetyLevel: chunk.level,
              }),
              db.update(sessions)
                .set({ riskLevel: 'crisis', crisisLevel: chunk.level, isFlagged: true })
                .where(eq(sessions.id, session.id)),
            ]);

            // Trigger SMS + call (awaited so we know the result before closing stream)
            getUserAlertSettings(userId).then((s) =>
              triggerLevelAlert(chunk.level as 3 | 4, sessionId, userId, s, location)
            ).catch(() => { /* logged inside triggerLevelAlert */ });

            break;
          }

          if (chunk.type === 'done') {
            finalSafetyLevel = chunk.safetyLevel;

            await db.insert(messages).values({
              sessionId:   session.id,
              role:        'assistant',
              content:     assistantContent,
              safetyLevel: finalSafetyLevel,
            });

            const timeline = (session.emotionTimeline as object[]) ?? [];
            await db.update(sessions)
              .set({
                emotionTimeline: [...timeline, { t: Date.now(), ...emotionScore }],
              })
              .where(eq(sessions.id, session.id));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encode({ type: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
