import { NextRequest, NextResponse } from 'next/server';
import { db, userSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const SettingsSchema = z.object({
  trustedContactName:  z.string().max(100).nullable(),
  trustedContactPhone: z.string().regex(/^\d{10}$/, 'Must be 10-digit Indian mobile number').nullable(),
  userName:            z.string().max(100).nullable(),
  shareLocation:       z.boolean(),
});

// GET /api/settings
export async function GET(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const s = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  return NextResponse.json({
    trustedContactName:  s?.trustedContactName  ?? null,
    trustedContactPhone: s?.trustedContactPhone ?? null,
    userName:            s?.userName            ?? null,
    shareLocation:       s?.shareLocation       ?? true,
  });
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  const userId = parseInt(req.headers.get('x-user-id') || '0', 10);

  const body   = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid settings', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) {
    await db.update(userSettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, ...parsed.data });
  }

  return NextResponse.json({ ok: true });
}
