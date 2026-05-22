import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import JournalClient from './client';

export const metadata = { title: 'Mood Journal — Harmony' };

export default async function JournalPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <JournalClient />;
}
