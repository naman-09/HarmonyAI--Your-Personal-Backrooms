import { NextRequest, NextResponse } from 'next/server';
import { db, journalEntries } from '@/lib/db';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const JournalSchema = z.object({
  mood: z.number().int().min(1).max(10),
  note: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const body   = await req.json().catch(() => null);
  const parsed = JournalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });
  }

  const { mood, note, date } = parsed.data;

  const existing = await db.query.journalEntries.findFirst({
    where: and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)),
  });

  if (existing) {
    await db.update(journalEntries)
      .set({ mood, note: note ?? null })
      .where(eq(journalEntries.id, existing.id));
  } else {
    await db.insert(journalEntries).values({ userId, mood, note: note ?? null, date });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);
  const url    = new URL(req.url);
  const from   = url.searchParams.get('from');
  const to     = url.searchParams.get('to');

  const conditions = [eq(journalEntries.userId, userId)];
  if (from) conditions.push(gte(journalEntries.date, from));
  if (to)   conditions.push(lte(journalEntries.date, to));

  const entries = await db.query.journalEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(journalEntries.date)],
    limit: 90,
  });

  return NextResponse.json({ entries });
}
