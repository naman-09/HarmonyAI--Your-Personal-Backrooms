import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db, userSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import ChatClient from './client';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Pre-load trusted contact name so crisis screen can personalise the message
  const s = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.userId),
  });

  return (
    <ChatClient
      sessionId={params.id}
      userId={session.userId}
      trustedContactName={s?.trustedContactName ?? undefined}
    />
  );
}
