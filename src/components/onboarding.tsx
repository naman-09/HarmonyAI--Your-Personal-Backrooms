'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const steps = [
  {
    icon: '💙',
    title: 'Welcome to Harmony',
    desc: 'A compassionate AI companion that listens, understands, and supports you — without judgement.',
    detail: 'Harmony uses multimodal emotion detection to sense how you\'re really feeling and adapt its responses.',
  },
  {
    icon: '🛡️',
    title: 'Your safety matters',
    desc: 'Harmony has a built-in 5-tier crisis detection system. If it senses you may be in danger, it acts.',
    detail: 'You can add a trusted contact in Settings — they\'ll receive an alert if Harmony detects severe distress.',
  },
  {
    icon: '🌿',
    title: 'Tools for your wellbeing',
    desc: 'Beyond conversation, Harmony offers a mood journal, breathing exercises, and curated mental health resources.',
    detail: 'Track your emotional patterns over time and build healthy coping habits at your own pace.',
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = steps[step];

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('harmony-onboarded', '1');
      onComplete();
    }
  }

  function skip() {
    localStorage.setItem('harmony-onboarded', '1');
    onComplete();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-bg)',
      zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: '1.5rem' }}>{current.icon}</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text)' }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          {current.desc}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-subtle)', lineHeight: 1.6, marginBottom: '2rem' }}>
          {current.detail}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2rem' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? 'var(--color-primary)' : 'var(--color-border-2)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          style={{
            width: '100%', padding: '12px',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: 15, fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '0.75rem',
          }}
        >
          {step < steps.length - 1 ? 'Continue' : 'Get started'}
        </button>

        <button
          onClick={skip}
          style={{
            background: 'none', border: 'none',
            color: 'var(--color-subtle)',
            fontSize: 13, cursor: 'pointer',
            padding: '8px',
          }}
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}
