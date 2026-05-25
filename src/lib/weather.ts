// ─── Weather library (Open-Meteo, no API key required) ────────
// Server-side helpers that proxy Open-Meteo and map WMO weather codes
// to friendly conditions used by the UI theme switcher.

export type WeatherCondition =
  | 'clear'      // sunny / mostly clear
  | 'cloudy'     // overcast / mostly cloudy
  | 'rain'       // any rain / drizzle
  | 'snow'       // any snow / ice
  | 'storm'      // thunderstorm
  | 'fog';       // fog / haze

export interface WeatherSnapshot {
  condition:   WeatherCondition;
  description: string;        // human-readable ("Light rain", "Clear sky", ...)
  temperatureC: number;
  feelsLikeC:  number;
  isDay:       boolean;       // server tells us whether it's daytime at that lat/lng
  windKph:     number;
  humidity:    number;        // %
  locationName?: string;      // resolved via reverse-geocoding (best-effort)
  fetchedAt:   number;        // epoch ms
}

// WMO weather-code → condition + description
// Reference: https://open-meteo.com/en/docs (Weather variable documentation)
const WMO_MAP: Record<number, { condition: WeatherCondition; desc: string }> = {
  0:  { condition: 'clear',  desc: 'Clear sky' },
  1:  { condition: 'clear',  desc: 'Mostly clear' },
  2:  { condition: 'cloudy', desc: 'Partly cloudy' },
  3:  { condition: 'cloudy', desc: 'Overcast' },
  45: { condition: 'fog',    desc: 'Foggy' },
  48: { condition: 'fog',    desc: 'Freezing fog' },
  51: { condition: 'rain',   desc: 'Light drizzle' },
  53: { condition: 'rain',   desc: 'Drizzle' },
  55: { condition: 'rain',   desc: 'Heavy drizzle' },
  56: { condition: 'rain',   desc: 'Freezing drizzle' },
  57: { condition: 'rain',   desc: 'Freezing drizzle' },
  61: { condition: 'rain',   desc: 'Light rain' },
  63: { condition: 'rain',   desc: 'Rain' },
  65: { condition: 'rain',   desc: 'Heavy rain' },
  66: { condition: 'rain',   desc: 'Freezing rain' },
  67: { condition: 'rain',   desc: 'Freezing rain' },
  71: { condition: 'snow',   desc: 'Light snow' },
  73: { condition: 'snow',   desc: 'Snow' },
  75: { condition: 'snow',   desc: 'Heavy snow' },
  77: { condition: 'snow',   desc: 'Snow grains' },
  80: { condition: 'rain',   desc: 'Rain showers' },
  81: { condition: 'rain',   desc: 'Heavy showers' },
  82: { condition: 'rain',   desc: 'Violent showers' },
  85: { condition: 'snow',   desc: 'Snow showers' },
  86: { condition: 'snow',   desc: 'Heavy snow showers' },
  95: { condition: 'storm',  desc: 'Thunderstorm' },
  96: { condition: 'storm',  desc: 'Thunderstorm with hail' },
  99: { condition: 'storm',  desc: 'Severe thunderstorm' },
};

export function mapWeatherCode(code: number): { condition: WeatherCondition; desc: string } {
  return WMO_MAP[code] ?? { condition: 'cloudy', desc: 'Cloudy' };
}

// ─── Open-Meteo fetcher ──────────────────────────────────────
export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current',   'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m');
  url.searchParams.set('timezone',  'auto');
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    // Next.js: cache 10 mins on the server; client should rely on this rather than re-fetch constantly
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const data    = await res.json() as {
    current: {
      time:                  string;
      temperature_2m:        number;
      relative_humidity_2m:  number;
      apparent_temperature:  number;
      is_day:                number;     // 0 | 1
      weather_code:          number;
      wind_speed_10m:        number;
    };
  };
  const c = data.current;
  const { condition, desc } = mapWeatherCode(c.weather_code);

  return {
    condition,
    description:  desc,
    temperatureC: Math.round(c.temperature_2m),
    feelsLikeC:   Math.round(c.apparent_temperature),
    isDay:        c.is_day === 1,
    windKph:      Math.round(c.wind_speed_10m),
    humidity:     Math.round(c.relative_humidity_2m),
    fetchedAt:    Date.now(),
  };
}

// ─── Best-effort reverse geocoding ───────────────────────────
// Uses Open-Meteo's free geocoding service. Returns the nearest city name.
export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('language',  'en');
  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 }, // city for a lat/lng never changes
    });
    if (!res.ok) return undefined;
    const data = await res.json() as { results?: Array<{ name?: string; admin1?: string }> };
    const r = data.results?.[0];
    if (!r?.name) return undefined;
    return r.admin1 ? `${r.name}, ${r.admin1}` : r.name;
  } catch {
    return undefined;
  }
}
