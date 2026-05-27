import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db, userSettings, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import ChatClient from './client';

// Next.js 15+: params is a Promise
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const [s, u] = await Promise.all([
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, session.userId) }),
    db.query.users.findFirst({ where: eq(users.id, session.userId) }),
  ]);

  return (
    <ChatClient
      sessionId={id}
      userId={session.userId}
      userName={u?.name ?? undefined}
      trustedContactName={s?.trustedContactName ?? undefined}
    />
  );
}
