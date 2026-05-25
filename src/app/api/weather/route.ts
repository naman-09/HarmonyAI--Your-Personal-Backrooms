import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather, reverseGeocode } from '@/lib/weather';

// GET /api/weather?lat=...&lng=...
// Cached server-side for 10 minutes via the underlying fetch.
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Out of range' }, { status: 400 });
  }

  try {
    const [snapshot, locationName] = await Promise.all([
      fetchWeather(lat, lng),
      reverseGeocode(lat, lng),
    ]);
    return NextResponse.json({
      ...snapshot,
      locationName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weather lookup failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
