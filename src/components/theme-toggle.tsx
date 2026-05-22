'use client';

import { useTheme } from './theme-provider';

export function ThemeToggle({ size = 18 }: { size?: number }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 6,
        fontSize: size,
        lineHeight: 1,
        color: 'var(--color-muted)',
        borderRadius: 'var(--radius-sm)',
        transition: 'color 0.15s',
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
