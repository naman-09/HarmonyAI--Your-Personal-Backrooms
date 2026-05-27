'use client';

import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ErrorBoundary } from './error-boundary';
import { ThemeProvider } from './theme-provider';
import { ThemeStoreProvider } from '@/lib/theme/store';
import { ThemedBackground } from './themed-background';
import { SmoothScrollProvider } from './motion/smooth-scroll';
import { LiquidGlassFilter } from './motion/liquid-glass-filter';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemeStoreProvider>
          <SmoothScrollProvider>
            {/* Animated, theme-driven background sits at z-index -10. */}
            <ThemedBackground />
            {/* iOS 26 Liquid Glass SVG filter defs — zero layout impact */}
            <LiquidGlassFilter />
            {/*
              AnimatePresence at the layout level lets page transitions
              run as routes change. mode="wait" ensures the exit animation
              completes before the enter starts.
            */}
            <AnimatePresence mode="wait" initial={false}>
              <div key={pathname} style={{ minHeight: '100vh' }}>
                {children}
              </div>
            </AnimatePresence>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background:   'var(--color-surface)',
                  border:       '1px solid var(--color-border)',
                  color:        'var(--color-text)',
                  fontSize:     14,
                  backdropFilter: 'blur(var(--glass-blur, 0px))',
                  WebkitBackdropFilter: 'blur(var(--glass-blur, 0px))',
                },
              }}
            />
          </SmoothScrollProvider>
        </ThemeStoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
