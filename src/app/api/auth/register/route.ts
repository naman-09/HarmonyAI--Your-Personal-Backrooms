import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { loginRateLimit } from '@/lib/redis';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const RegisterSchema = z.object({
  email:    z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least 1 number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least 1 special character'),
  name:     z.string().min(1, 'Name is required').max(100),
});

export async function POST(req: NextRequest) {
  // Rate limit by IP (reusing login rate limiter to prevent abuse)
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await loginRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait 15 minutes.' },
      { status: 429 }
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid request';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user
  const result = await db.insert(users).values({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    isActive: true,
  }).returning({ id: users.id, email: users.email, name: users.name });
  
  const newUser = result[0];

  // Auto-login
  await createSession({ userId: newUser.id, email: newUser.email });

  return NextResponse.json({ ok: true, name: newUser.name }, { status: 201 });
}
