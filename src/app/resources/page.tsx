import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ResourcesClient from './client';

export const metadata = { title: 'Resources — Harmony' };

export default async function ResourcesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ResourcesClient />;
}
