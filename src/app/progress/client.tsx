'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

interface Stats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  journalEntries: number;
  avgMood: number | null;
  streak: number;
  weeklyMoods: { week: string; avg: number }[];
  sessionFrequency: { week: string; count: number }[];
  milestones: { label: string; achieved: boolean }[];
}

export default function ProgressClient() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const card: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1rem',
  };

  function exportData(format: string) {
    window.location.href = `/api/export?format=${format}`;
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 580, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Your progress</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>Track your wellness journey</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle size={16} />
          <button
            onClick={() => router.push('/dashboard')}
            style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Loading stats...</p>
      ) : !stats ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Unable to load stats.</p>
      ) : (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
            <StatCard label="Sessions" value={stats.totalSessions} />
            <StatCard label="Messages" value={stats.totalMessages} />
            <StatCard label="Journal entries" value={stats.journalEntries} />
            <StatCard label="Journal streak" value={`${stats.streak}d`} />
          </div>

          {stats.avgMood !== null && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>Average mood</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{stats.avgMood}</span>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>/ 10</span>
                <div style={{
                  flex: 1, height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${stats.avgMood * 10}%`, height: '100%',
                    background: stats.avgMood >= 7 ? 'var(--color-success)' : stats.avgMood >= 4 ? 'var(--color-warning)' : 'var(--color-danger)',
                    borderRadius: 4, transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Weekly mood trend */}
          {stats.weeklyMoods.some((w) => w.avg > 0) && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>Mood trend (4 weeks)</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {stats.weeklyMoods.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{w.avg || '-'}</span>
                    <div style={{
                      width: '100%', maxWidth: 40,
                      height: w.avg > 0 ? `${w.avg * 6}px` : 2,
                      background: w.avg > 0 ? 'var(--color-primary)' : 'var(--color-border-2)',
                      borderRadius: 4, transition: 'height 0.3s',
                    }} />
                    <span style={{ fontSize: 10, color: 'var(--color-subtle)' }}>{w.week}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session frequency */}
          {stats.sessionFrequency.some((w) => w.count > 0) && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>Sessions per week</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
                {stats.sessionFrequency.map((w, i) => {
                  const maxCount = Math.max(...stats.sessionFrequency.map((s) => s.count), 1);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{w.count}</span>
                      <div style={{
                        width: '100%', maxWidth: 40,
                        height: w.count > 0 ? `${(w.count / maxCount) * 40}px` : 2,
                        background: w.count > 0 ? 'var(--color-success)' : 'var(--color-border-2)',
                        borderRadius: 4, transition: 'height 0.3s',
                      }} />
                      <span style={{ fontSize: 10, color: 'var(--color-subtle)' }}>{w.week}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {stats.milestones.length > 0 && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>Milestones</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.milestones.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    background: m.achieved ? 'rgba(52,211,153,0.06)' : 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    border: m.achieved ? '1px solid rgba(52,211,153,0.2)' : '1px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: 16 }}>{m.achieved ? '✅' : '⬜'}</span>
                    <span style={{
                      fontSize: 13,
                      color: m.achieved ? 'var(--color-success)' : 'var(--color-muted)',
                      textDecoration: m.achieved ? 'none' : 'none',
                    }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data export */}
          <div style={card}>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>Export your data</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => exportData('json')}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)', fontSize: 13, cursor: 'pointer',
                }}
              >
                All data (JSON)
              </button>
              <button
                onClick={() => exportData('csv')}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Journal (CSV)
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
    }}>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600 }}>{value}</p>
    </div>
  );
}
