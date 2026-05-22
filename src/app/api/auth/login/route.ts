import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { loginRateLimit } from '@/lib/redis';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await loginRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait 15 minutes.' },
      { status: 429 }
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  const passwordValid = user ? await bcrypt.compare(password, user.password) : false;

  if (!user || !passwordValid || !user.isActive) {
    // Same error for both "user not found" and "wrong password"
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await createSession({ userId: user.id, email: user.email });

  return NextResponse.json({ ok: true, name: user.name });
}
