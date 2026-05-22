'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BreathingExercise } from '@/components/breathing-exercise';

interface Resource {
  title:       string;
  description: string;
  category:    string;
  type:        'article' | 'exercise' | 'video';
}

const RESOURCES: Resource[] = [
  { title: 'Understanding Anxiety', description: 'Learn what happens in your body during anxiety and simple ways to manage it.', category: 'anxiety', type: 'article' },
  { title: 'The 5-4-3-2-1 Grounding Technique', description: 'A quick exercise to ground yourself when feeling overwhelmed or panicked.', category: 'anxiety', type: 'exercise' },
  { title: 'Progressive Muscle Relaxation', description: 'Systematically tense and release muscle groups to relieve physical stress.', category: 'stress', type: 'exercise' },
  { title: 'Dealing with Depression', description: 'Understanding depression and small steps you can take when everything feels heavy.', category: 'depression', type: 'article' },
  { title: 'Managing Anger Constructively', description: 'Healthy ways to process and express anger without harming yourself or others.', category: 'anger', type: 'article' },
  { title: 'Coping with Grief', description: 'Understanding the grieving process and giving yourself permission to feel.', category: 'grief', type: 'article' },
  { title: 'Building Healthy Relationships', description: 'Setting boundaries, communicating needs, and nurturing connections.', category: 'relationships', type: 'article' },
  { title: 'Sleep Hygiene Tips', description: 'Simple changes to your routine that can dramatically improve sleep quality.', category: 'stress', type: 'article' },
  { title: 'Self-Compassion Practice', description: 'Learn to treat yourself with the same kindness you show to others.', category: 'depression', type: 'exercise' },
  { title: 'Journaling for Mental Health', description: 'How writing down your thoughts can help process emotions and reduce stress.', category: 'stress', type: 'article' },
];

const CATEGORIES = ['all', 'anxiety', 'depression', 'stress', 'anger', 'grief', 'relationships'];

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  article:  { label: 'Article',  color: 'var(--color-primary)' },
  exercise: { label: 'Exercise', color: 'var(--color-success)' },
  video:    { label: 'Video',    color: 'var(--color-warning)' },
};

export default function ResourcesClient() {
  const router = useRouter();
  const [filter, setFilter]         = useState('all');
  const [showBreathing, setShowBreathing] = useState(false);

  const filtered = filter === 'all' ? RESOURCES : RESOURCES.filter((r) => r.category === filter);

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Resources</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>Tools and knowledge for your wellbeing</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Dashboard
        </button>
      </div>

      {/* Breathing exercise card */}
      {showBreathing ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <BreathingExercise onClose={() => setShowBreathing(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowBreathing(true)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: 'rgba(107,143,255,0.08)',
            border: '1px solid rgba(107,143,255,0.2)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: '1.25rem',
            color: 'var(--color-text)',
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Breathing Exercise</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Try box breathing, 4-7-8, or simple calm breathing</p>
        </button>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              borderRadius: 999,
              border: `1px solid ${filter === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: filter === cat ? 'rgba(107,143,255,0.12)' : 'transparent',
              color: filter === cat ? 'var(--color-primary)' : 'var(--color-muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resource list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((r, i) => {
          const badge = TYPE_BADGES[r.type];
          return (
            <div key={i} style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 999,
                  background: `${badge.color}18`,
                  color: badge.color,
                }}>
                  {badge.label}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-subtle)',
                  textTransform: 'capitalize',
                }}>
                  {r.category}
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{r.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>{r.description}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
