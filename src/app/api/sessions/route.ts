import { NextRequest, NextResponse } from 'next/server';
import { db, sessions } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { cacheSession } from '@/lib/redis';

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const sessionId = crypto.randomUUID();

  await db.insert(sessions).values({
    userId,
    sessionId,
    emotionTimeline: [],
    riskLevel: 'none',
    isFlagged: false,
  });

  await cacheSession(sessionId, { userId, createdAt: Date.now() });

  return NextResponse.json({ sessionId }, { status: 201 });
}

// GET /api/sessions — list sessions for the current user
//   Pinned chats float to the top; everything else by most-recent first.
export async function GET(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const userSessions = await db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: [desc(sessions.pinned), desc(sessions.createdAt)],
    limit: 50,
  });

  return NextResponse.json({ sessions: userSessions });
}
