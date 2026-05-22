import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE = 'harmony_token';
const EXPIRY = '7d';

export interface JWTPayload {
  userId: number;
  email: string;
}

// ─── Sign & set cookie ───────────────────────────────────────
export async function createSession(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return token;
}

// ─── Verify from cookie (server components) ──────────────────
export async function getSession(): Promise<JWTPayload | null> {
  try {
    const token = cookies().get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Verify from request header (middleware / API routes) ────
export async function verifyToken(req: NextRequest): Promise<JWTPayload> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) throw new Error('No token');
  const { payload } = await jwtVerify(token, SECRET);
  return payload as unknown as JWTPayload;
}

// ─── Clear cookie ─────────────────────────────────────────────
export function clearSession() {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' });
}
