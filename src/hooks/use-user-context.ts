'use client';

import { useEffect, useState } from 'react';
import type { WeatherCondition, WeatherSnapshot } from '@/lib/weather';

// ─── Time-of-day buckets ─────────────────────────────────────
// 7 phases that pair to the 7 custom icons. Boundaries can shift
// slightly seasonally but these are sensible defaults.
export type TimeOfDay =
  | 'early-morning'   // 04-06
  | 'morning'         // 06-11
  | 'daylight'        // 11-14
  | 'afternoon'       // 14-17
  | 'dusk'            // 17-19   (the "dawn" in user's wording — sunset transition)
  | 'evening'         // 19-21
  | 'night';          // 21-04

export function getTimeOfDay(hour: number = new Date().getHours()): TimeOfDay {
  if (hour < 4)  return 'night';
  if (hour < 6)  return 'early-morning';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'daylight';
  if (hour < 17) return 'afternoon';
  if (hour < 19) return 'dusk';
  if (hour < 21) return 'evening';
  return 'night';
}

export function describeTimeOfDay(tod: TimeOfDay): string {
  switch (tod) {
    case 'early-morning': return 'Early morning';
    case 'morning':       return 'Morning';
    case 'daylight':      return 'Midday';
    case 'afternoon':     return 'Afternoon';
    case 'dusk':          return 'Dusk';
    case 'evening':       return 'Evening';
    case 'night':         return 'Night';
  }
}

// ─── Hook ────────────────────────────────────────────────────
export interface UserContext {
  timeOfDay: TimeOfDay;
  hour:      number;
  weather:   (WeatherSnapshot & { condition: WeatherCondition }) | null;
  location:  { lat: number; lng: number } | null;
  loading:   boolean;
  error:     string | null;
  /** Manually trigger a re-fetch of weather. */
  refresh:   () => Promise<void>;
}

const CACHE_KEY = 'harmony-weather-cache';
const CACHE_TTL = 15 * 60 * 1000;   // 15 minutes
const PERM_KEY  = 'harmony-permissions';

interface CachedWeather {
  lat:      number;
  lng:      number;
  data:     WeatherSnapshot & { locationName?: string };
  cachedAt: number;
}

function loadCache(): CachedWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (Date.now() - parsed.cachedAt > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function saveCache(lat: number, lng: number, data: WeatherSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      lat, lng, data, cachedAt: Date.now(),
    }));
  } catch { /* localStorage may be full */ }
}

/** Did the user explicitly grant location during onboarding? */
function locationAllowed(): boolean {
  try {
    const raw = localStorage.getItem(PERM_KEY);
    if (!raw) return false;
    return JSON.parse(raw).location === true;
  } catch { return false; }
}

export function useUserContext(): UserContext {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay());
  const [hour,      setHour]      = useState<number>(() => new Date().getHours());
  const [weather,   setWeather]   = useState<UserContext['weather']>(null);
  const [location,  setLocation]  = useState<UserContext['location']>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Tick the clock every minute so the icon updates near boundaries
  useEffect(() => {
    const id = setInterval(() => {
      const h = new Date().getHours();
      setHour(h);
      setTimeOfDay(getTimeOfDay(h));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Location → weather
  async function loadWeather(skipPermissionCheck = false) {
    setLoading(true);
    setError(null);

    if (!skipPermissionCheck && !locationAllowed()) {
      setLoading(false);
      return;
    }
    if (!navigator.geolocation) {
      setLoading(false);
      setError('Geolocation not supported');
      return;
    }

    // Try cached weather first (avoids waiting on geolocation if we have fresh data)
    const cached = loadCache();
    if (cached) {
      setLocation({ lat: cached.lat, lng: cached.lng });
      setWeather(cached.data as UserContext['weather']);
      setLoading(false);
      // Continue and refresh in the background if the cache is older than 5 mins
      if (Date.now() - cached.cachedAt < 5 * 60 * 1000) return;
    }

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          (e) => reject(e),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
        );
      });
      const lat = coords.latitude;
      const lng = coords.longitude;
      setLocation({ lat, lng });

      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
      const data = await res.json() as WeatherSnapshot;
      setWeather(data as UserContext['weather']);
      saveCache(lat, lng, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weather unavailable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWeather(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return {
    timeOfDay,
    hour,
    weather,
    location,
    loading,
    error,
    refresh: () => loadWeather(true),
  };
}
