import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, messages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { invalidateSession } from '@/lib/redis';

// GET /api/sessions/[id] — fetch session + messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId    = Number(req.headers.get('x-user-id'));
  const { id: sessionId } = await params;

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

// PATCH /api/sessions/[id]
//   - Body `{}` (or omitted)      → ends the session (legacy "End session" button)
//   - Body `{ title: "..." }`     → rename the chat (also clears endedAt? no — keep as-is)
//   - Body `{ pinned: boolean }`  → pin/unpin
//   - Body `{ end: true }`        → end (explicit)
//   Multiple fields allowed in one PATCH.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId    = Number(req.headers.get('x-user-id'));
  const { id: sessionId } = await params;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Tolerant body parse — empty/invalid body means "end this session" (legacy)
  let body: { title?: string; pinned?: boolean; end?: boolean } = {};
  try { body = await req.json(); } catch { /* legacy: no body = end */ }

  const updates: Record<string, unknown> = {};

  if (typeof body.title === 'string') {
    const trimmed = body.title.trim().slice(0, 80);
    updates.title = trimmed || null;
  }
  if (typeof body.pinned === 'boolean') {
    updates.pinned = body.pinned;
  }
  // Legacy "End session" button sends an empty body; explicit { end: true } also supported.
  const isLegacyEnd = !body.title && body.pinned === undefined && !('end' in body);
  if (body.end === true || isLegacyEnd) {
    updates.endedAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  await db
    .update(sessions)
    .set(updates)
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)));

  if (updates.endedAt) await invalidateSession(sessionId);

  return NextResponse.json({ ok: true });
}

// DELETE /api/sessions/[id] — permanently delete session + its messages
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId    = Number(req.headers.get('x-user-id'));
  const { id: sessionId } = await params;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete messages first (FK constraint)
  await db.delete(messages).where(eq(messages.sessionId, session.id));

  // Delete the session
  await db
    .delete(sessions)
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)));

  await invalidateSession(sessionId);

  return NextResponse.json({ ok: true });
}
