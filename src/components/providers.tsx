'use client';

import { Toaster } from 'sonner';
import { ErrorBoundary } from './error-boundary';
import { ThemeProvider } from './theme-provider';
import { ThemeStoreProvider } from '@/lib/theme/store';
import { ThemedBackground } from './themed-background';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemeStoreProvider>
          {/* Animated, theme-driven background sits at z-index -10. */}
          <ThemedBackground />
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
        </ThemeStoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
