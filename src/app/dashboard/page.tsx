import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DashboardClient from './client';

const ADMIN_EMAIL = 'naman@harmony.com';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <DashboardClient
      userId={session.userId}
      isAdmin={session.email === ADMIN_EMAIL}
    />
  );
}
