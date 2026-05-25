'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, MessageCircle, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { Onboarding } from '@/components/onboarding';
import { Sidebar } from '@/components/sidebar';

interface Session {
  sessionId: string;
  title:     string | null;
  pinned:    boolean;
  createdAt: string;
  endedAt:   string | null;
  riskLevel: string;
}

export default function DashboardClient({ userId, isAdmin }: { userId: number; isAdmin?: boolean }) {
  const router = useRouter();
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('harmony-onboarded')) {
      setShowOnboard(true);
    }
  }, []);

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
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/chat/${data.sessionId}`);
    } catch {
      toast.error('Failed to start session');
      setCreating(false);
    }
  }

  if (showOnboard) {
    return <Onboarding onComplete={() => setShowOnboard(false)} />;
  }

  const greeting = greetingFor(new Date().getHours());
  const recent = sessions.slice(0, 6);

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} />

      <main className="app-main">
        <div className="dash-inner">
          {/* ── Hero greeting ── */}
          <header className="dash-hero">
            <div className="dash-burst" aria-hidden>
              <svg viewBox="0 0 64 64" width="48" height="48">
                <g fill="rgba(200,145,90,0.95)">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <rect key={i} x="30.5" y="4" width="3" height="18" rx="1.5"
                      transform={`rotate(${i * 30} 32 32)`}
                      opacity={0.55 + (i % 3) * 0.15}
                    />
                  ))}
                </g>
                <circle cx="32" cy="32" r="6" fill="rgba(200,145,90,1)" />
              </svg>
            </div>
            <h1 className="dash-title">{greeting}</h1>
            <p className="dash-sub">What would you like to do today?</p>
          </header>

          {/* ── Primary CTA + Quick links ── */}
          <button
            onClick={startNewSession}
            disabled={creating}
            className="dash-primary-cta"
          >
            <div className="cta-text">
              <p className="cta-title">{creating ? 'Starting…' : 'Start a new conversation'}</p>
              <p className="cta-sub">Talk through anything on your mind — Harmony listens</p>
            </div>
            <ArrowRight size={20} className="cta-arrow" />
          </button>

          <div className="quick-grid">
            <QuickCard
              icon={<TrendingUp size={18} />}
              title="See your progress"
              sub="Trends, streaks, milestones"
              onClick={() => router.push('/progress')}
            />
            <QuickCard
              icon={<BookOpen size={18} />}
              title="Log today's mood"
              sub="One quick check-in"
              onClick={() => router.push('/journal')}
            />
            <QuickCard
              icon={<Sparkles size={18} />}
              title="Browse resources"
              sub="Tools and reading"
              onClick={() => router.push('/resources')}
            />
          </div>

          {/* ── Recent chats — same data as sidebar, but inline for context ── */}
          {!loading && recent.length > 0 && (
            <section className="recent-section">
              <p className="section-eyebrow">Pick up where you left off</p>
              <div className="recent-list">
                {recent.map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => router.push(`/chat/${s.sessionId}`)}
                    className="recent-row"
                  >
                    <MessageCircle size={15} className="recent-icon" />
                    <div className="recent-text">
                      <p className="recent-title">{s.title || 'Untitled conversation'}</p>
                      <p className="recent-meta">
                        {new Date(s.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })}
                        <span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>
                        {s.endedAt ? 'ended' : 'active'}
                      </p>
                    </div>
                    <ArrowRight size={14} className="recent-arrow" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading && recent.length === 0 && (
            <p className="dash-empty">
              No conversations yet. The button above starts your first one.
            </p>
          )}

          <p className="dash-footer">
            Harmony is not a substitute for professional mental health care.
            In crisis? Call iCall: <a href="tel:9152987821">9152987821</a>.
          </p>
        </div>
      </main>

      {/* ── Styles ───────────────────────────────────────── */}
      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }
        .app-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
        }
        .dash-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 3rem 2rem 2rem;
        }

        .dash-hero {
          text-align: center;
          margin-bottom: 2rem;
        }
        .dash-burst {
          display: flex; justify-content: center;
          margin-bottom: 0.75rem;
          animation: dashBurst 24s linear infinite;
        }
        .dash-title {
          font-family: Georgia, 'Fraunces', serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.1;
          color: var(--color-text);
          margin: 0;
        }
        .dash-sub {
          font-size: 14px;
          color: var(--color-muted);
          margin: 0.5rem 0 0;
        }

        .dash-primary-cta {
          width: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--color-primary) 14%, var(--color-surface)),
            var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
          border-radius: var(--radius-lg);
          color: var(--color-text);
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          margin-bottom: 14px;
          transition: all 0.18s ease;
        }
        .dash-primary-cta:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
          box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 12%, transparent);
        }
        .dash-primary-cta:disabled { opacity: 0.6; cursor: not-allowed; }
        .cta-text { display: flex; flex-direction: column; gap: 3px; }
        .cta-title { font-size: 15.5px; font-weight: 600; margin: 0; }
        .cta-sub { font-size: 13px; color: var(--color-muted); margin: 0; }
        .cta-arrow { color: var(--color-primary); flex-shrink: 0; transition: transform 0.18s; }
        .dash-primary-cta:hover:not(:disabled) .cta-arrow { transform: translateX(3px); }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 2rem;
        }
        .quick-card {
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          color: var(--color-text);
          transition: all 0.15s;
        }
        .quick-card:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
        }
        .quick-card-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px;
          color: var(--color-primary);
          margin-bottom: 8px;
        }
        .quick-card-title { font-size: 13.5px; font-weight: 600; margin: 0 0 2px; }
        .quick-card-sub   { font-size: 12px; color: var(--color-muted); margin: 0; }

        .section-eyebrow {
          font-size: 11px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--color-muted);
          font-weight: 600;
          margin: 0 0 0.75rem;
        }
        .recent-section { margin-bottom: 1.5rem; }
        .recent-list {
          display: flex; flex-direction: column; gap: 4px;
        }
        .recent-row {
          width: 100%;
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: all 0.15s;
        }
        .recent-row:hover {
          border-color: var(--color-border-2);
          background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
        }
        .recent-icon { color: var(--color-muted); flex-shrink: 0; }
        .recent-text { flex: 1; min-width: 0; }
        .recent-title {
          font-size: 13.5px; font-weight: 500;
          margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .recent-meta {
          font-size: 11.5px; color: var(--color-subtle);
          margin: 2px 0 0;
        }
        .recent-arrow {
          color: var(--color-subtle);
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .recent-row:hover .recent-arrow {
          color: var(--color-primary);
          transform: translateX(2px);
        }

        .dash-empty {
          padding: 1rem;
          font-size: 13.5px;
          color: var(--color-muted);
          text-align: center;
        }
        .dash-footer {
          margin-top: 3rem;
          font-size: 11.5px;
          color: var(--color-subtle);
          text-align: center;
          line-height: 1.6;
        }
        .dash-footer a { color: var(--color-primary); text-decoration: none; }
        .dash-footer a:hover { text-decoration: underline; }

        @keyframes dashBurst { to { transform: rotate(360deg); } }

        @media (max-width: 760px) {
          .dash-inner { padding: 1.5rem 1rem 2rem; }
          .quick-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-burst { animation: none; }
        }
      `}</style>
    </div>
  );
}

function QuickCard({ icon, title, sub, onClick }: {
  icon: React.ReactNode; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="quick-card">
      <div className="quick-card-icon">{icon}</div>
      <p className="quick-card-title">{title}</p>
      <p className="quick-card-sub">{sub}</p>
    </button>
  );
}

function greetingFor(hour: number): string {
  if (hour < 5)  return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
