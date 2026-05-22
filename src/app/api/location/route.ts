import { NextRequest, NextResponse } from 'next/server';
import { db, sessions } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const LocationSchema = z.object({
  lat:       z.number().min(-90).max(90),
  lng:       z.number().min(-180).max(180),
  sessionId: z.string().uuid(),
});

// POST /api/location — store last known coords against the active session
export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const body   = await req.json().catch(() => null);
  const parsed = LocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
  }

  const { lat, lng, sessionId } = parsed.data;

  // Verify ownership
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await db.update(sessions)
    .set({ location: JSON.stringify({ lat, lng }) })
    .where(eq(sessions.sessionId, sessionId));

  return NextResponse.json({ ok: true });
}
