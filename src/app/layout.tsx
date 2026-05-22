import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Harmony — AI Wellness Companion',
  description: 'A compassionate space to process emotions with AI support.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Harmony — AI Wellness Companion',
    description: 'A compassionate space to process emotions with AI support.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0c0f1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <Providers><div id="main-content">{children}</div></Providers>
      </body>
    </html>
  );
}
