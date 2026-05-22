'use client';

import { useRouter } from 'next/navigation';

interface AuditEvent {
  id:        number;
  sessionId: string;
  userId:    number;
  event:     string;
  metadata:  any;
  createdAt: Date | string;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  crisis_detected:    { label: 'Crisis detected',  color: '#f87171' },
  crisis_alert_sent:  { label: 'Alert sent',       color: '#fbbf24' },
  distress_detected:  { label: 'Distress',         color: '#fb923c' },
};

export default function AdminClient({ events }: { events: AuditEvent[] }) {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Crisis Event Log</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
            {events.length} events — admin only view
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Dashboard
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-muted)',
          fontSize: 14,
        }}>
          No crisis events recorded yet. That&apos;s a good sign 💙
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((e) => {
            const meta     = (e.metadata ?? {}) as Record<string, any>;
            const tag      = EVENT_LABELS[e.event] ?? { label: e.event, color: 'var(--color-muted)' };
            const ts       = new Date(e.createdAt).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            return (
              <div
                key={e.id}
                style={{
                  padding:      '1rem 1.25rem',
                  background:   'var(--color-surface)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  borderLeft:   `3px solid ${tag.color}`,
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      padding: '3px 9px', borderRadius: 999,
                      background: `${tag.color}22`,
                      color: tag.color,
                    }}>
                      {tag.label}
                    </span>
                    {meta.level != null && (
                      <span style={{
                        fontSize: 12, padding: '3px 9px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--color-muted)',
                      }}>
                        Level {meta.level}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-subtle)' }}>{ts}</span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 13, color: 'var(--color-muted)' }}>
                  <span>User ID: <strong style={{ color: 'var(--color-text)' }}>{e.userId}</strong></span>
                  <span>Session: <strong style={{ color: 'var(--color-text)', fontFamily: 'monospace', fontSize: 11 }}>{e.sessionId.slice(0, 18)}…</strong></span>

                  {meta.smsStatus && (
                    <span>SMS: <strong style={{ color: meta.smsStatus === 'sent' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {meta.smsStatus}
                    </strong></span>
                  )}
                  {meta.callStatus && (
                    <span>Call: <strong style={{ color: meta.callStatus === 'sent' ? 'var(--color-success)' : 'var(--color-muted)' }}>
                      {meta.callStatus}
                    </strong></span>
                  )}
                  {meta.trustedContactReached != null && (
                    <span>Reached: <strong style={{ color: meta.trustedContactReached ? 'var(--color-success)' : 'var(--color-muted)' }}>
                      {meta.trustedContactReached ? 'yes' : 'no'}
                    </strong></span>
                  )}
                  {meta.hasLocation != null && (
                    <span>Location: <strong style={{ color: 'var(--color-text)' }}>{meta.hasLocation ? '✓' : '—'}</strong></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
