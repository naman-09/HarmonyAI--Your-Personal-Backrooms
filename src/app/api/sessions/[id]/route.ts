import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, messages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { invalidateSession } from '@/lib/redis';

// GET /api/sessions/[id] — fetch session + messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId    = Number(req.headers.get('x-user-id'));
  const sessionId = params.id;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sessionMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, session.id),
    orderBy: [asc(messages.createdAt)],
  });

  return NextResponse.json({ session, messages: sessionMessages });
}

// PATCH /api/sessions/[id] — end a session
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId    = Number(req.headers.get('x-user-id'));
  const sessionId = params.id;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db
    .update(sessions)
    .set({ endedAt: new Date() })
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)));

  await invalidateSession(sessionId);

  return NextResponse.json({ ok: true });
}
