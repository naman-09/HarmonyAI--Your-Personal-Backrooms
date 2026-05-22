import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db, auditLog } from '@/lib/db';
import { eq, desc, like } from 'drizzle-orm';
import AdminClient from './client';

export const metadata = { title: 'Admin — Harmony Crisis Log' };

const ADMIN_EMAIL = 'naman@harmony.com';

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Restrict to admin email only
  if (session.email !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  // Fetch all crisis-related audit events, newest first
  const events = await db.query.auditLog.findMany({
    orderBy: [desc(auditLog.createdAt)],
    limit: 200,
  });

  // Filter to crisis events only (crisis_detected, crisis_alert_sent, distress_detected)
  const crisisEvents = events.filter((e) =>
    ['crisis_detected', 'crisis_alert_sent', 'distress_detected'].includes(e.event)
  );

  return <AdminClient events={crisisEvents} />;
}
