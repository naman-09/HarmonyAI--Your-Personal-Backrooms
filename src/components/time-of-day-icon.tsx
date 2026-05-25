'use client';

import { useEffect, useState } from 'react';
import type { TimeOfDay } from '@/hooks/use-user-context';

// ─── 3 icon styles the user can pick from ────────────────────
export type IconStyle = 'custom' | 'animated' | 'twemoji';
const STYLE_KEY = 'harmony-icon-style';

export function getIconStyle(): IconStyle {
  if (typeof window === 'undefined') return 'animated';
  const stored = localStorage.getItem(STYLE_KEY);
  if (stored === 'custom' || stored === 'animated' || stored === 'twemoji') return stored;
  return 'animated';
}

export function setIconStyle(style: IconStyle) {
  localStorage.setItem(STYLE_KEY, style);
  // Fire a storage event for other tabs / components listening
  window.dispatchEvent(new CustomEvent('harmony-icon-style', { detail: style }));
}

export function useIconStyle(): IconStyle {
  const [style, setStyle] = useState<IconStyle>('animated');
  useEffect(() => {
    setStyle(getIconStyle());
    function onChange(e: Event) {
      if (e instanceof CustomEvent) setStyle(e.detail as IconStyle);
    }
    window.addEventListener('harmony-icon-style', onChange);
    return () => window.removeEventListener('harmony-icon-style', onChange);
  }, []);
  return style;
}

// ─── Twemoji codepoints per time-of-day ──────────────────────
// Twemoji CDN serves SVG by codepoint. These match each time bucket.
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg';
const TWEMOJI_MAP: Record<TimeOfDay, string> = {
  'early-morning': '1f306',     // 🌆 cityscape at dusk (works as pre-dawn glow)
  'morning':       '1f305',     // 🌅 sunrise
  'daylight':      '2600',      // ☀️ sun
  'afternoon':     '1f31e',     // 🌞 sun with face
  'dusk':          '1f307',     // 🌇 sunset
  'evening':       '1f30c',     // 🌌 milky way (twilight stars)
  'night':         '1f319',     // 🌙 crescent moon
};

// ─── Main component ──────────────────────────────────────────
interface Props {
  tod:   TimeOfDay;
  size?: number;
  /** Override the user's stored preference (use sparingly). */
  style?: IconStyle;
  className?: string;
}

export function TimeOfDayIcon({ tod, size = 56, style: styleOverride, className }: Props) {
  const styleFromHook = useIconStyle();
  const style = styleOverride ?? styleFromHook;

  if (style === 'twemoji') {
    return (
      <img
        src={`${TWEMOJI_BASE}/${TWEMOJI_MAP[tod]}.svg`}
        alt={tod}
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      />
    );
  }

  return <CustomIcon tod={tod} size={size} animated={style === 'animated'} className={className} />;
}

// ─── Custom SVG illustrations ────────────────────────────────
// One unified SVG component that draws each time-of-day differently.
// `animated` adds CSS keyframes for subtle motion (sun ray spin, star twinkle,
// cloud drift). Pure CSS — no Lottie / no extra deps.
function CustomIcon({ tod, size, animated, className }: {
  tod: TimeOfDay; size: number; animated: boolean; className?: string;
}) {
  // Sky gradients per time-of-day
  const gradients: Record<TimeOfDay, [string, string]> = {
    'early-morning': ['#1f1b3a', '#5a4a7a'],   // deep indigo → muted purple
    'morning':       ['#ffd9a8', '#ffaa6e'],   // peach → terracotta
    'daylight':      ['#a8d8ff', '#5ab9ff'],   // sky blue
    'afternoon':     ['#ffe2a0', '#ffb56b'],   // warm gold
    'dusk':          ['#ff8a5b', '#bb3f6b'],   // orange → magenta
    'evening':       ['#3a2f5e', '#1a1737'],   // dusky purple
    'night':         ['#0a0e2a', '#1f234c'],   // deep night
  };

  const [from, to] = gradients[tod];
  const id = `tod-grad-${tod}`;
  const starId = `tod-star-${tod}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block' }}
      aria-label={tod}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={from} />
          <stop offset="100%" stopColor={to}   />
        </linearGradient>
        <radialGradient id={starId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky disc */}
      <circle cx="32" cy="32" r="30" fill={`url(#${id})`} />

      {/* Body — per-time content */}
      {tod === 'early-morning' && <EarlyMorningBody animated={animated} />}
      {tod === 'morning'       && <MorningBody       animated={animated} />}
      {tod === 'daylight'      && <DaylightBody      animated={animated} />}
      {tod === 'afternoon'     && <AfternoonBody     animated={animated} />}
      {tod === 'dusk'          && <DuskBody          animated={animated} />}
      {tod === 'evening'       && <EveningBody       animated={animated} starId={starId} />}
      {tod === 'night'         && <NightBody         animated={animated} starId={starId} />}

      {/* Subtle outer ring for clarity in light theme */}
      <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(0,0,0,0.06)" />

      {animated && (
        <style>{`
          @keyframes todSpin   { to { transform: rotate(360deg); } }
          @keyframes todPulse  { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
          @keyframes todTwinkle{ 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
          @keyframes todDrift  { from { transform: translateX(-2px); } to { transform: translateX(2px); } }
          @keyframes todRise   { 0% { transform: translateY(2px); } 100% { transform: translateY(0); } }
        `}</style>
      )}
    </svg>
  );
}

// ─── Sub-illustrations ────────────────────────────────────────

function EarlyMorningBody({ animated }: { animated: boolean }) {
  return (
    <g>
      {/* Horizon */}
      <path d="M2 44 L62 44" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* Faint sun cresting */}
      <circle cx="32" cy="46" r="9" fill="#ffcfa0" opacity="0.85"
        style={animated ? { transformOrigin: '32px 46px', animation: 'todRise 3s ease-out infinite alternate' } : undefined}
      />
      {/* Sliver of light */}
      <ellipse cx="32" cy="42" rx="22" ry="2.5" fill="#ffd9a8" opacity="0.35" />
      {/* Dim stars */}
      <circle cx="14" cy="14" r="0.7" fill="#fff" opacity="0.7" />
      <circle cx="48" cy="18" r="0.5" fill="#fff" opacity="0.6" />
      <circle cx="50" cy="9"  r="0.6" fill="#fff" opacity="0.5" />
    </g>
  );
}

function MorningBody({ animated }: { animated: boolean }) {
  return (
    <g>
      {/* Hills */}
      <path d="M2 50 Q22 36 32 44 T62 48 L62 62 L2 62 Z" fill="rgba(0,0,0,0.18)" />
      {/* Sun lower-left, mid-rise */}
      <g style={animated ? { transformOrigin: '24px 36px', animation: 'todSpin 30s linear infinite' } : undefined}>
        <g fill="#fff7d6">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="23" y="22" width="2" height="6" rx="1"
              transform={`rotate(${i * 45} 24 36)`} opacity={0.7 + (i % 3) * 0.1}
            />
          ))}
        </g>
      </g>
      <circle cx="24" cy="36" r="7" fill="#ffd866"
        style={animated ? { transformOrigin: '24px 36px', animation: 'todPulse 4s ease-in-out infinite' } : undefined}
      />
    </g>
  );
}

function DaylightBody({ animated }: { animated: boolean }) {
  return (
    <g>
      {/* Drifting cloud */}
      <g style={animated ? { animation: 'todDrift 4s ease-in-out infinite alternate' } : undefined}>
        <ellipse cx="46" cy="22" rx="9" ry="3" fill="#fff" opacity="0.9" />
        <ellipse cx="40" cy="24" rx="6" ry="2.5" fill="#fff" opacity="0.85" />
      </g>
      {/* Centered sun + rays */}
      <g style={animated ? { transformOrigin: '32px 34px', animation: 'todSpin 26s linear infinite' } : undefined}>
        <g fill="#fff09a">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x="31" y="14" width="2" height="6" rx="1"
              transform={`rotate(${i * 30} 32 34)`} opacity={0.65 + (i % 3) * 0.12}
            />
          ))}
        </g>
      </g>
      <circle cx="32" cy="34" r="8.5" fill="#ffd755"
        style={animated ? { transformOrigin: '32px 34px', animation: 'todPulse 5s ease-in-out infinite' } : undefined}
      />
    </g>
  );
}

function AfternoonBody({ animated }: { animated: boolean }) {
  return (
    <g>
      {/* Soft long cloud */}
      <ellipse cx="20" cy="20" rx="11" ry="3.2" fill="#fff" opacity="0.85"
        style={animated ? { animation: 'todDrift 6s ease-in-out infinite alternate' } : undefined}
      />
      {/* Sun upper-right, with long rays angled down */}
      <g style={animated ? { transformOrigin: '42px 30px', animation: 'todSpin 35s linear infinite' } : undefined}>
        <g fill="#ffd093">
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x="41" y="16" width="2" height="7" rx="1"
              transform={`rotate(${i * 36} 42 30)`} opacity={0.6 + (i % 3) * 0.13}
            />
          ))}
        </g>
      </g>
      <circle cx="42" cy="30" r="8" fill="#ffae5a"
        style={animated ? { transformOrigin: '42px 30px', animation: 'todPulse 4.5s ease-in-out infinite' } : undefined}
      />
    </g>
  );
}

function DuskBody({ animated }: { animated: boolean }) {
  return (
    <g>
      {/* Layered horizon glow */}
      <ellipse cx="32" cy="46" rx="30" ry="6" fill="#ffba7a" opacity="0.55" />
      <ellipse cx="32" cy="50" rx="30" ry="4" fill="#bb4868" opacity="0.4" />
      {/* Half-sun on horizon */}
      <circle cx="32" cy="46" r="9" fill="#ffba5e"
        style={animated ? { transformOrigin: '32px 46px', animation: 'todPulse 3.5s ease-in-out infinite' } : undefined}
      />
      <rect x="2" y="46" width="60" height="16" fill="rgba(0,0,0,0.3)" />
      {/* A first star */}
      <circle cx="48" cy="14" r="0.8" fill="#fff" opacity="0.85"
        style={animated ? { animation: 'todTwinkle 2s ease-in-out infinite' } : undefined}
      />
    </g>
  );
}

function EveningBody({ animated, starId }: { animated: boolean; starId: string }) {
  const stars = [
    { x: 14, y: 14, r: 0.9, delay: 0   },
    { x: 22, y: 22, r: 0.6, delay: 0.4 },
    { x: 44, y: 12, r: 1.0, delay: 0.2 },
    { x: 50, y: 24, r: 0.7, delay: 0.7 },
    { x: 36, y: 18, r: 0.5, delay: 0.5 },
    { x: 12, y: 30, r: 0.4, delay: 0.9 },
    { x: 54, y: 16, r: 0.5, delay: 1.1 },
  ];
  return (
    <g>
      {/* Horizon hill */}
      <path d="M2 50 Q32 38 62 50 L62 62 L2 62 Z" fill="rgba(0,0,0,0.4)" />
      {/* Faded crescent */}
      <circle cx="42" cy="32" r="8" fill="#f1eada" opacity="0.7" />
      <circle cx="44" cy="30" r="7.5" fill="url(#tod-grad-evening)" />
      {/* Stars */}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={s.r * 2.5}
          fill={`url(#${starId})`} opacity="0.7"
          style={animated ? { transformOrigin: `${s.x}px ${s.y}px`, animation: `todTwinkle 2.${i}s ease-in-out infinite ${s.delay}s` } : undefined}
        />
      ))}
    </g>
  );
}

function NightBody({ animated, starId }: { animated: boolean; starId: string }) {
  const stars = [
    { x: 12, y: 14, r: 1.0, delay: 0   },
    { x: 20, y: 24, r: 0.7, delay: 0.3 },
    { x: 50, y: 12, r: 1.1, delay: 0.6 },
    { x: 55, y: 24, r: 0.8, delay: 0.9 },
    { x: 8,  y: 36, r: 0.6, delay: 0.4 },
    { x: 28, y: 12, r: 0.5, delay: 1.2 },
    { x: 40, y: 22, r: 0.4, delay: 0.7 },
    { x: 58, y: 38, r: 0.5, delay: 1.5 },
  ];
  return (
    <g>
      {/* Crescent moon */}
      <circle cx="40" cy="32" r="10" fill="#f1eada"
        style={animated ? { transformOrigin: '40px 32px', animation: 'todPulse 8s ease-in-out infinite' } : undefined}
      />
      <circle cx="36" cy="29" r="9" fill="url(#tod-grad-night)" />
      {/* Stars */}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={s.r * 2.5}
          fill={`url(#${starId})`} opacity="0.85"
          style={animated ? { transformOrigin: `${s.x}px ${s.y}px`, animation: `todTwinkle 1.${i + 4}s ease-in-out infinite ${s.delay}s` } : undefined}
        />
      ))}
    </g>
  );
}
