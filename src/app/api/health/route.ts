import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { getFastAPIHealth } from '@/lib/fastapi';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  let healthy = true;

  try {
    await db.select({ count: sql`1` }).from(users).limit(1);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const res = await fetch(ollamaUrl, { signal: AbortSignal.timeout(5000) });
    checks.ollama = res.ok ? 'ok' : 'error';
  } catch {
    checks.ollama = 'error';
  }

  const fastapi = await getFastAPIHealth();
  if (fastapi !== 'disabled') checks.fastapi = fastapi;

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
