import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, messages, journalEntries } from '@/lib/db';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userSessions = await db.select({
    id: sessions.id,
    sessionId: sessions.sessionId,
    createdAt: sessions.createdAt,
    endedAt: sessions.endedAt,
  }).from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt));

  const totalSessions = userSessions.length;
  const activeSessions = userSessions.filter((s) => !s.endedAt).length;

  let totalMessages = 0;
  for (const s of userSessions) {
    const [count] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(messages).where(eq(messages.sessionId, s.id));
    totalMessages += count?.count ?? 0;
  }

  const journal = await db.select({
    mood: journalEntries.mood,
    date: journalEntries.date,
  }).from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.date));

  const avgMood = journal.length > 0
    ? Math.round((journal.reduce((sum, j) => sum + j.mood, 0) / journal.length) * 10) / 10
    : null;

  // Streak calculation
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (journal.some((j) => j.date === dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  // Weekly mood trend (last 4 weeks)
  const weeklyMoods: { week: string; avg: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - w * 7);

    const weekEntries = journal.filter((j) => {
      const d = new Date(j.date);
      return d >= weekStart && d <= weekEnd;
    });

    const avg = weekEntries.length > 0
      ? Math.round((weekEntries.reduce((s, e) => s + e.mood, 0) / weekEntries.length) * 10) / 10
      : 0;

    weeklyMoods.push({
      week: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      avg,
    });
  }

  // Session frequency (sessions per week, last 4 weeks)
  const sessionFrequency: { week: string; count: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - w * 7);

    const count = userSessions.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= weekStart && d <= weekEnd;
    }).length;

    sessionFrequency.push({
      week: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count,
    });
  }

  // Milestones
  const milestones = [];
  if (totalSessions >= 1)  milestones.push({ label: 'First conversation', achieved: true });
  if (totalSessions >= 5)  milestones.push({ label: '5 sessions', achieved: true });
  if (totalSessions >= 10) milestones.push({ label: '10 sessions', achieved: true });
  if (journal.length >= 1) milestones.push({ label: 'First journal entry', achieved: true });
  if (streak >= 7)         milestones.push({ label: '7-day journal streak', achieved: true });
  if (streak >= 30)        milestones.push({ label: '30-day journal streak', achieved: true });

  // Add next upcoming milestone
  if (totalSessions < 5)  milestones.push({ label: '5 sessions', achieved: false });
  else if (totalSessions < 10) milestones.push({ label: '10 sessions', achieved: false });
  if (journal.length === 0) milestones.push({ label: 'First journal entry', achieved: false });
  if (streak < 7) milestones.push({ label: '7-day journal streak', achieved: false });

  return NextResponse.json({
    totalSessions,
    activeSessions,
    totalMessages,
    journalEntries: journal.length,
    avgMood,
    streak,
    weeklyMoods,
    sessionFrequency,
    milestones,
  });
}
