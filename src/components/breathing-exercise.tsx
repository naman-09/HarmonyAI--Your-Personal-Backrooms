'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Pattern = {
  name: string;
  phases: { label: string; duration: number }[];
};

const PATTERNS: Pattern[] = [
  {
    name: 'Box Breathing (4-4-4-4)',
    phases: [
      { label: 'Breathe in', duration: 4 },
      { label: 'Hold', duration: 4 },
      { label: 'Breathe out', duration: 4 },
      { label: 'Hold', duration: 4 },
    ],
  },
  {
    name: '4-7-8 Breathing',
    phases: [
      { label: 'Breathe in', duration: 4 },
      { label: 'Hold', duration: 7 },
      { label: 'Breathe out', duration: 8 },
    ],
  },
  {
    name: 'Simple Calm',
    phases: [
      { label: 'Breathe in', duration: 5 },
      { label: 'Breathe out', duration: 5 },
    ],
  },
];

function playBell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

export function BreathingExercise({ onClose }: { onClose: () => void }) {
  const [patternIdx, setPatternIdx] = useState(0);
  const [running, setRunning]       = useState(false);
  const [phaseIdx, setPhaseIdx]     = useState(0);
  const [timer, setTimer]           = useState(0);
  const [cycles, setCycles]         = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = PATTERNS[patternIdx];
  const phase   = pattern.phases[phaseIdx];
  const progress = phase ? timer / phase.duration : 0;

  const isInhale = phase?.label.includes('in');
  const isExhale = phase?.label.includes('out');
  const circleScale = isInhale ? 0.6 + progress * 0.4 : isExhale ? 1 - progress * 0.4 : 1;

  const tick = useCallback(() => {
    setTimer((prev) => {
      const newTimer = prev + 0.05;
      if (newTimer >= (phase?.duration ?? 0)) {
        playBell();
        setPhaseIdx((pi) => {
          const next = pi + 1;
          if (next >= pattern.phases.length) {
            setCycles((c) => c + 1);
            return 0;
          }
          return next;
        });
        return 0;
      }
      return newTimer;
    });
  }, [phase, pattern.phases.length]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  function startStop() {
    if (running) {
      setRunning(false);
    } else {
      setPhaseIdx(0);
      setTimer(0);
      setCycles(0);
      setRunning(true);
    }
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.5rem',
      maxWidth: 380,
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Breathing Exercise</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 18, padding: 4,
        }} aria-label="Close">
          ×
        </button>
      </div>

      {/* Pattern selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PATTERNS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => { setPatternIdx(i); setRunning(false); setPhaseIdx(0); setTimer(0); setCycles(0); }}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              borderRadius: 999,
              border: `1px solid ${i === patternIdx ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: i === patternIdx ? 'rgba(161,206,63,0.08)' : 'transparent',
              color: i === patternIdx ? 'var(--color-primary)' : 'var(--color-muted)',
              cursor: 'pointer',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(161,206,63,${0.07 + progress * 0.12}) 0%, rgba(16,126,87,0.03) 70%)`,
          border: '2px solid rgba(161,206,63,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${circleScale})`,
          transition: 'transform 0.05s linear',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-primary)' }}>
              {running ? phase?.label : 'Ready'}
            </p>
            {running && (
              <p style={{ fontSize: 24, fontWeight: 300, color: 'var(--color-text)', marginTop: 4 }}>
                {Math.ceil(phase.duration - timer)}
              </p>
            )}
          </div>
        </div>
        {cycles > 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 10 }}>
            {cycles} cycle{cycles > 1 ? 's' : ''} complete
          </p>
        )}
      </div>

      <button
        onClick={startStop}
        style={{
          width: '100%',
          padding: '10px',
          background: running ? 'rgba(224,122,63,0.10)' : 'var(--color-primary)',
          border: running ? '1px solid rgba(224,122,63,0.28)' : 'none',
          borderRadius: 'var(--radius-md)',
          color: running ? 'var(--color-danger)' : '#011a10',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}
