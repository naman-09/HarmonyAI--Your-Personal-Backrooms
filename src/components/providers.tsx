'use client';

import { Toaster } from 'sonner';
import { ErrorBoundary } from './error-boundary';
import { ThemeProvider } from './theme-provider';
import { WeatherThemeBridge } from './weather-theme-bridge';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* Globally applies the weather-conditional tint based on user location. */}
        <WeatherThemeBridge />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: 14,
            },
          }}
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
