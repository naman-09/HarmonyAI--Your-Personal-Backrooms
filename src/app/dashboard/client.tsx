'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
  sessionId: string;
  createdAt: string;
  endedAt:   string | null;
  riskLevel: string;
}

export default function DashboardClient({ userId, isAdmin }: { userId: number; isAdmin?: boolean }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function startNewSession() {
    setCreating(true);
    try {
      const res  = await fetch('/api/sessions', { method: 'POST' });
      const data = await res.json();
      router.push(`/chat/${data.sessionId}`);
    } catch {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Your sessions</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>Each conversation is a safe space</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              style={{
                fontSize: 12, color: 'var(--color-warning)',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', padding: '5px 10px',
              }}
            >
              Crisis log
            </button>
          )}
          <button
            onClick={() => router.push('/settings')}
            style={{
              fontSize: 13, color: 'var(--color-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
            }}
          >
            ⚙ Settings
          </button>
          <button
            onClick={logout}
            style={{
              fontSize: 13, color: 'var(--color-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* New session button */}
      <button
        onClick={startNewSession}
        disabled={creating}
        style={{
          width: '100%', padding: '14px',
          background: creating ? 'rgba(107,143,255,0.3)' : 'rgba(107,143,255,0.12)',
          border: '1px dashed rgba(107,143,255,0.4)',
          borderRadius: 'var(--radius-lg)',
          color: creating ? 'var(--color-muted)' : 'var(--color-primary)',
          fontSize: 14, fontWeight: 500,
          cursor: creating ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem',
          transition: 'all 0.15s',
        }}
      >
        {creating ? 'Starting…' : '+ Start a new conversation'}
      </button>

      {/* Session list */}
      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Loading…</p>
      ) : sessions.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No sessions yet. Start your first one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => router.push(`/chat/${s.sessionId}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-text)', fontSize: 14,
                cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              <span>
                {new Date(s.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span style={{
                fontSize: 12, padding: '3px 9px', borderRadius: 999,
                background: s.endedAt ? 'rgba(255,255,255,0.05)' : 'rgba(107,143,255,0.12)',
                color:      s.endedAt ? 'var(--color-muted)' : 'var(--color-primary)',
              }}>
                {s.endedAt ? 'ended' : 'active'}
              </span>
            </button>
          ))}
        </div>
      )}

      <p style={{ marginTop: '3rem', fontSize: 12, color: 'var(--color-subtle)', lineHeight: 1.7 }}>
        Harmony is not a substitute for professional mental health care.
        In crisis? Call iCall: 9152987821.
      </p>
    </main>
  );
}
