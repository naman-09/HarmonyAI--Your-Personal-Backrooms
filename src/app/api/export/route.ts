import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, messages, journalEntries, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const format = req.nextUrl.searchParams.get('format') ?? 'json';

  const [user] = await db.select({
    email: users.email,
    name: users.name,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId));

  const userSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));

  const allMessages: Record<string, any[]> = {};
  for (const s of userSessions) {
    const msgs = await db.select({
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
      safetyLevel: messages.safetyLevel,
    }).from(messages).where(eq(messages.sessionId, s.id));
    allMessages[s.sessionId] = msgs;
  }

  const journal = await db.select().from(journalEntries).where(eq(journalEntries.userId, userId));

  if (format === 'csv') {
    const rows = ['date,mood,note'];
    for (const j of journal) {
      const note = (j.note ?? '').replace(/"/g, '""');
      rows.push(`${j.date},${j.mood},"${note}"`);
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="harmony-journal.csv"',
      },
    });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: { email: user?.email, name: user?.name, createdAt: user?.createdAt },
    sessions: userSessions.map((s) => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
      riskLevel: s.riskLevel,
      messages: allMessages[s.sessionId] ?? [],
    })),
    journal: journal.map((j) => ({
      date: j.date,
      mood: j.mood,
      note: j.note,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="harmony-data.json"',
    },
  });
}
