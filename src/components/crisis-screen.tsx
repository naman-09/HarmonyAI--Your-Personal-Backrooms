'use client';

import { useEffect, useRef, useState } from 'react';
import { HARMONY_PALETTE } from '@/lib/theme/colors';

interface CrisisScreenProps {
  level:            3 | 4;
  trustedName?:     string;
  onSafe:           () => void;
}

// ─── Web Audio: gentle descending tone — calm, not alarming ──
function playAlertSound() {
  try {
    const ctx  = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.2);
    gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + 2.2);

    // Two soft tones — warm fifth interval (A3 + E4)
    [220, 330].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freq * 0.92, ctx.currentTime + 2);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 2.2);
    });
  } catch {
    // AudioContext may be unavailable in some environments — fail silently
  }
}

export default function CrisisScreen({ level, trustedName = 'Your trusted contact', onSafe }: CrisisScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [canDismiss,  setCanDismiss]  = useState(false);
  const soundPlayed = useRef(false);

  // Play gentle alert on mount
  useEffect(() => {
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playAlertSound();
    }
  }, []);

  // 60-second countdown before "I am safe" unlocks
  useEffect(() => {
    if (secondsLeft <= 0) {
      setCanDismiss(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const callNumbers = [
    { label: 'iCall (TISS)',    number: '9152987821',  color: HARMONY_PALETTE.crisis.button },
    { label: 'Vandrevala 24/7', number: '18602662345', color: HARMONY_PALETTE.accents.glow },
    { label: 'Emergency 112',   number: '112',          color: HARMONY_PALETTE.crisis.button },
  ];

  // CRITICAL: this screen MUST always render on top of everything,
  // unhidden by any theme override or ThemedBackground layer.
  // z-index 9999 + opacity/visibility !important prevents accidental hiding.
  return (
    <div
      className="crisis-screen"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        background:     `linear-gradient(135deg, ${HARMONY_PALETTE.crisis.bg} 0%, ${HARMONY_PALETTE.crisis.bgEnd} 100%)`,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '2rem',
        overflowY:      'auto',
      }}
    >

      {/* Pulsing heart */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{
          fontSize:        '4rem',
          display:         'block',
          animation:       'harmonyPulse 2.8s ease-in-out infinite',
          transformOrigin: 'center',
        }}>
          💗
        </span>
      </div>

      {/* Main message */}
      <h1 style={{
        fontSize:   'clamp(1.6rem, 5vw, 2.4rem)',
        fontWeight: 700,
        color:      '#fff',
        textAlign:  'center',
        lineHeight: 1.3,
        marginBottom: '1rem',
        textShadow: '0 0 40px rgba(255,100,100,0.3)',
      }}>
        You matter.
        <br />
        Help is on the way.
      </h1>

      {/* Sub-message */}
      <p style={{
        fontSize:    '1.05rem',
        color:       'rgba(255,220,220,0.85)',
        textAlign:   'center',
        lineHeight:  1.7,
        maxWidth:    400,
        marginBottom: '2.5rem',
      }}>
        {level === 4
          ? `${trustedName} has been alerted and is being called right now. 💙`
          : `${trustedName} has been sent a message and knows you might need them. 💙`}
        <br />
        You are not alone in this moment.
      </p>

      {/* Call buttons */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           12,
        width:         '100%',
        maxWidth:      340,
        marginBottom:  '2.5rem',
      }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 4 }}>
          Tap to call a counsellor right now:
        </p>
        {callNumbers.map(({ label, number, color }) => (
          <a
            key={number}
            href={`tel:${number}`}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 20px',
              background:     'rgba(255,255,255,0.05)',
              border:         `1px solid ${color}55`,
              borderRadius:   16,
              color:          '#fff',
              textDecoration: 'none',
              fontSize:       15,
              fontWeight:     500,
              transition:     'background 0.2s',
            }}
          >
            <span>{label}</span>
            <span style={{ color, fontWeight: 700 }}>{number}</span>
          </a>
        ))}
      </div>

      {/* I am safe button */}
      <button
        onClick={canDismiss ? onSafe : undefined}
        disabled={!canDismiss}
        style={{
          padding:       '14px 40px',
          borderRadius:  999,
          border:        canDismiss ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.1)',
          background:    canDismiss ? 'rgba(255,255,255,0.12)' : 'transparent',
          color:         canDismiss ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize:      15,
          fontWeight:    600,
          cursor:        canDismiss ? 'pointer' : 'not-allowed',
          transition:    'all 0.3s',
          letterSpacing: '0.02em',
        }}
      >
        {canDismiss ? 'I am safe ✓' : `I am safe (available in ${secondsLeft}s)`}
      </button>

      {/* Pulse animation */}
      <style>{`
        @keyframes harmonyPulse {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.12); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
