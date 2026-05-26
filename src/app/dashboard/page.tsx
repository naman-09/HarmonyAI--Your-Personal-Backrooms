import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db, users, userSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import DashboardClient from './client';

const ADMIN_EMAIL = 'naman@harmony.com';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Fetch user name (from users.name) and settings userName in parallel
  const [u, s] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, session.userId) }),
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, session.userId) }),
  ]);

  // Prefer the explicitly set display name from settings, fall back to signup name
  const userName = s?.userName ?? u?.name ?? undefined;

  return (
    <DashboardClient
      userId={session.userId}
      isAdmin={session.email === ADMIN_EMAIL}
      userName={userName}
    />
  );
}
