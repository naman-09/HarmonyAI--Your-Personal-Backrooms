import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db, userSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import SettingsClient from './client';

export const metadata = { title: 'Settings — Harmony' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const s = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.userId),
  });

  const initial = {
    trustedContactName:  s?.trustedContactName  ?? '',
    trustedContactPhone: s?.trustedContactPhone ?? '',
    userName:            s?.userName            ?? '',
    shareLocation:       s?.shareLocation       ?? true,
  };

  return <SettingsClient initial={initial} />;
}
