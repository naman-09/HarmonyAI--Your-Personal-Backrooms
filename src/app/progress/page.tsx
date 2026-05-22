import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProgressClient from './client';

export default async function ProgressPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ProgressClient />;
}
