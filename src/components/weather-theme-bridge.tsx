'use client';

// Thin client wrapper that runs the useUserContext hook at the top of the
// React tree and forwards the weather condition to WeatherTheme. We can't
// call hooks from Providers directly because the hook reads localStorage
// and triggers a geolocation request — which we only want once.

import { useUserContext } from '@/hooks/use-user-context';
import { WeatherTheme } from './weather-theme';

export function WeatherThemeBridge() {
  const { weather } = useUserContext();
  return <WeatherTheme condition={weather?.condition ?? null} />;
}
