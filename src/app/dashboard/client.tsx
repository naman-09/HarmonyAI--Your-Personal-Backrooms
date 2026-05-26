'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Flame, TrendingUp, TrendingDown, Minus, ArrowRight, Plus } from 'lucide-react';
import { Onboarding } from '@/components/onboarding';
import { Sidebar } from '@/components/sidebar';
import { TimeOfDayIcon } from '@/components/time-of-day-icon';
import { useUserContext } from '@/hooks/use-user-context';
import { ClientStyle } from '@/components/client-style';

interface Stats {
  totalSessions:    number;
  journalEntries:   number;
  avgMood:          number | null;
  streak:           number;
  weeklyMoods:      { week: string; avg: number }[];
}

interface TodayJournal {
  mood: number;
  note: string | null;
  date: string;
}

const MOOD_LEVELS = [
  { emoji: '😞', label: 'Awful',     color: '#6366f1' },
  { emoji: '😔', label: 'Down',      color: '#7c7ee8' },
  { emoji: '😟', label: 'Worried',   color: '#9388dd' },
  { emoji: '😐', label: 'Meh',       color: '#a98ab8' },
  { emoji: '🙂', label: 'Okay',      color: '#bf8d96' },
  { emoji: '😊', label: 'Good',      color: '#c8915a' },
  { emoji: '😄', label: 'Happy',     color: '#d4a052' },
  { emoji: '😁', label: 'Great',     color: '#d9b04a' },
  { emoji: '🥳', label: 'Wonderful', color: '#d4c042' },
  { emoji: '✨', label: 'Glowing',   color: '#bcc73a' },
];

// ── Apple emoji CDN — cross-platform consistency ─────────────
function emojiImgSrc(emoji: string): string {
  const cp = [...emoji]
    .map(c => c.codePointAt(0)!)
    .filter(n => n !== 0xFE0F)
    .map(n => n.toString(16))
    .join('-');
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${cp}.png`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardClient({ userId, isAdmin, userName }: { userId: number; isAdmin?: boolean; userName?: string }) {
  const router = useRouter();
  const userCtx = useUserContext();
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [todayMood,   setTodayMood]   = useState<TodayJournal | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    // v2 key — bumped when the permissions step was added so existing
    // users get re-prompted to grant location/camera/mic/etc.
    if (!localStorage.getItem('harmony-onboarded-v2')) setShowOnboard(true);
  }, []);

  // Load Today snapshot data — stats + today's journal entry in parallel
  useEffect(() => {
    const today = todayStr();
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch(`/api/journal?from=${today}&to=${today}`).then((r) => r.json()),
    ])
      .then(([s, j]) => {
        setStats(s);
        const entry = (j.entries ?? []).find((e: TodayJournal) => e.date === today);
        setTodayMood(entry ?? null);
      })
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
      setCreating(false);
    }
  }

  // ── Derive headline insight from weekly mood trend ─────────────
  const insight = useMemo(() => {
    if (!stats) return null;
    const moods = stats.weeklyMoods.filter((w) => w.avg > 0).map((w) => w.avg);
    if (moods.length < 2) {
      if (stats.streak >= 7) {
        return { icon: 'flame', text: `${stats.streak}-day journaling streak — keep going.` };
      }
      if (stats.totalSessions === 0 && stats.journalEntries === 0) {
        return { icon: 'spark', text: 'Your story begins here.' };
      }
      return { icon: 'steady', text: 'Building your picture — log a mood or chat with Harmony.' };
    }
    const recent = moods[moods.length - 1];
    const prior  = moods[0];
    const pct = Math.round(((recent - prior) / prior) * 100);
    if (Math.abs(pct) < 8) return { icon: 'steady', text: 'Steady waters — mood has been stable this month.' };
    if (pct > 0) return { icon: 'up',   text: `Mood up ${Math.abs(pct)}% over 4 weeks. Notice what helped.` };
    return         { icon: 'down', text: `Mood is ${Math.abs(pct)}% lower than 4 weeks ago — reach out if it's heavy.` };
  }, [stats]);

  if (showOnboard) {
    return <Onboarding onComplete={() => setShowOnboard(false)} />;
  }

  const greeting   = greetingFor(new Date().getHours());
  const firstName  = userName?.trim().split(/\s+/)[0];
  const todayLevel = todayMood ? MOOD_LEVELS[todayMood.mood - 1] : null;

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} />

      <main className="app-main">
        {/* Top-right utility bar — settings gear */}
        <div className="utility-bar">
          <button
            onClick={() => router.push('/settings')}
            className="utility-btn"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>
        </div>

        <div className="dash-inner">
          {/* ── Hero greeting ── */}
          <header className="dash-hero">
            <div className="dash-burst" aria-hidden>
              <TimeOfDayIcon tod={userCtx.timeOfDay} size={64} />
            </div>
            <h1 className="dash-title">
              {greeting}{firstName ? <>, <em className="dash-name">{firstName}</em></> : ''}
            </h1>
            <p className="dash-sub">
              {userCtx.weather?.locationName && userCtx.weather?.description ? (
                <>It&apos;s {userCtx.weather.description.toLowerCase()} in {userCtx.weather.locationName} · {userCtx.weather.temperatureC}°</>
              ) : (
                <>Here&apos;s your day at a glance.</>
              )}
            </p>
          </header>

          {/* ── Today snapshot ── */}
          <section className="snapshot-grid">

            {/* Mood card — either shows today's logged mood, or a quick logger */}
            {loading ? (
              <SnapshotSkeleton tall />
            ) : todayMood && todayLevel ? (
              <button
                onClick={() => router.push('/journal')}
                className="snap-card snap-card-tall snap-mood-set"
                style={{
                  borderColor: `color-mix(in srgb, ${todayLevel.color} 35%, var(--color-border))`,
                }}
              >
                <p className="snap-label">Today&apos;s mood</p>
                <div className="snap-mood-display">
                  <img src={emojiImgSrc(todayLevel.emoji)} alt={todayLevel.label} width={38} height={38} className="snap-mood-emoji" />
                  <div>
                    <p className="snap-mood-name" style={{ color: todayLevel.color }}>
                      {todayLevel.label}
                    </p>
                    <p className="snap-mood-num">{todayMood.mood} / 10</p>
                  </div>
                </div>
                {todayMood.note && (
                  <p className="snap-mood-note">&ldquo;{todayMood.note.slice(0, 100)}{todayMood.note.length > 100 ? '…' : ''}&rdquo;</p>
                )}
                <span className="snap-link">Open journal <ArrowRight size={12} /></span>
              </button>
            ) : (
              <QuickMoodLogger onSaved={(entry) => setTodayMood(entry)} />
            )}

            {/* Streak card */}
            {loading ? (
              <SnapshotSkeleton />
            ) : (
              <button
                onClick={() => router.push('/progress')}
                className={`snap-card ${stats!.streak > 0 ? 'snap-card-accent' : ''}`}
              >
                <p className="snap-label">
                  <Flame size={13} /> Journaling streak
                </p>
                <p className="snap-big-num">
                  {stats!.streak}
                  <span className="snap-big-unit">{stats!.streak === 1 ? 'day' : 'days'}</span>
                </p>
                <p className="snap-sub">
                  {stats!.streak === 0
                    ? 'A single check-in starts it.'
                    : stats!.streak < 7
                      ? "You're warming up — one day at a time."
                      : stats!.streak < 30
                        ? 'Real consistency. Keep going.'
                        : 'Remarkable. This is the work.'}
                </p>
              </button>
            )}

            {/* Insight card */}
            {loading ? (
              <SnapshotSkeleton />
            ) : (
              <button
                onClick={() => router.push('/progress')}
                className="snap-card snap-card-insight"
              >
                <p className="snap-label">
                  <InsightIcon kind={insight?.icon ?? 'spark'} /> Insight
                </p>
                <p className="snap-insight-text">{insight?.text}</p>
                <span className="snap-link">See full progress <ArrowRight size={12} /></span>
              </button>
            )}
          </section>

          {/* ── Subtle floating CTA — only obvious primary action remaining ── */}
          <button
            onClick={startNewSession}
            disabled={creating}
            className="dash-floating-cta"
            title="Open a new conversation with Harmony"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>{creating ? 'Starting…' : 'Talk to Harmony'}</span>
          </button>

          <p className="dash-footer">
            Not a substitute for professional care. In crisis? Call iCall: <a href="tel:9152987821">9152987821</a>.
          </p>
        </div>
      </main>

      {/* ── Styles ───────────────────────────────────────── */}
      <ClientStyle>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }
        .app-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          position: relative;
        }

        /* Top-right utility bar (settings gear) */
        .utility-bar {
          position: absolute;
          top: 16px; right: 18px;
          z-index: 5;
        }
        .utility-btn {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 50%;
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .utility-btn:hover {
          color: var(--color-primary);
          border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          transform: rotate(45deg);
        }

        .dash-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 4rem 2rem 2rem;
        }

        /* ── Hero ── */
        .dash-hero {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .dash-burst {
          display: flex; justify-content: center;
          margin-bottom: 0.75rem;
          animation: dashBurst 38s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) { .dash-burst { animation: none; } }
        .dash-title {
          font-family: var(--font-serif);
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.1;
          color: var(--color-text);
          margin: 0;
        }
        .dash-name {
          font-style: italic;
          color: var(--color-primary);
        }
        .dash-sub {
          font-size: 14px;
          color: var(--color-muted);
          margin: 0.5rem 0 0;
        }

        /* ── Snapshot grid ── */
        .snapshot-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1.6fr;
          gap: 12px;
          margin-bottom: 2rem;
        }
        .snap-card {
          display: flex; flex-direction: column;
          align-items: flex-start; text-align: left; justify-content: flex-start;
          padding: 18px 20px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          color: var(--color-text);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
          min-height: 132px;
        }
        .snap-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-border-2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }
        .snap-card-tall {
          grid-row: span 1;
          min-height: 168px;
        }
        .snap-card-accent {
          background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
        }
        .snap-card-insight {
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)),
            var(--color-surface));
        }
        .snap-label {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-muted);
          font-weight: 600;
          margin: 0 0 12px;
        }
        .snap-big-num {
          font-size: 38px;
          font-weight: 600;
          line-height: 1;
          margin: 0 0 8px;
          display: flex; align-items: baseline; gap: 6px;
        }
        .snap-big-unit {
          font-size: 14px;
          color: var(--color-muted);
          font-weight: 500;
        }
        .snap-sub {
          font-size: 12.5px;
          color: var(--color-muted);
          margin: 0;
          line-height: 1.5;
        }
        .snap-insight-text {
          font-size: 14px;
          line-height: 1.55;
          font-weight: 500;
          margin: 0 0 auto;
          color: var(--color-text);
          font-family: var(--font-serif);
        }
        .snap-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--color-primary);
          margin-top: 12px;
          opacity: 0.85;
          transition: opacity 0.15s, gap 0.15s;
        }
        .snap-card:hover .snap-link { opacity: 1; gap: 6px; }

        /* Mood-set card variants */
        .snap-mood-set {
          gap: 4px;
        }
        .snap-mood-display {
          display: flex; align-items: center; gap: 12px;
          margin: 0 0 6px;
        }
        .snap-mood-emoji {
          width: 38px; height: 38px;
          flex-shrink: 0;
        }
        .snap-mood-name {
          font-size: 17px;
          font-weight: 600;
          margin: 0;
        }
        .snap-mood-num {
          font-size: 12px;
          color: var(--color-muted);
          margin: 2px 0 0;
        }
        .snap-mood-note {
          font-size: 12.5px;
          font-style: italic;
          color: var(--color-muted);
          line-height: 1.5;
          margin: 6px 0 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* ── Floating CTA ── */
        .dash-floating-cta {
          display: inline-flex; align-items: center; gap: 8px;
          margin: 0 auto;
          padding: 11px 22px;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-pill);
          color: #011a10;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          box-shadow: var(--shadow-cta);
          transition: all 0.18s var(--ease-out);
        }
        .dash-floating-cta:disabled { opacity: 0.6; cursor: not-allowed; }
        .dash-floating-cta:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(161, 206, 63, 0.50);
        }
        /* Center the inline-flex button */
        .dash-inner > .dash-floating-cta {
          display: flex;
          margin-left: auto;
          margin-right: auto;
          width: fit-content;
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

        @media (max-width: 880px) {
          .snapshot-grid { grid-template-columns: 1fr; }
          .snap-card { min-height: auto; }
        }
        @media (max-width: 760px) {
          .dash-inner { padding: 3rem 1rem 2rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-burst { animation: none; }
        }
      `}</ClientStyle>
    </div>
  );
}

// ── Inline mood logger — used when no entry exists for today ───
function QuickMoodLogger({ onSaved }: { onSaved: (e: TodayJournal) => void }) {
  const [picking, setPicking] = useState<number | null>(null);
  const [saving,  setSaving]  = useState(false);

  async function save(mood: number) {
    setPicking(mood);
    setSaving(true);
    try {
      const date = todayStr();
      const res  = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, date }),
      });
      if (!res.ok) throw new Error();
      onSaved({ mood, note: null, date });
    } catch {
      setSaving(false);
      setPicking(null);
    }
  }

  return (
    <div className="snap-card snap-card-tall snap-logger">
      <p className="snap-label">Log today&apos;s mood</p>
      <p className="snap-logger-prompt">How are you feeling?</p>
      <div className="logger-row" aria-hidden={saving}>
        {MOOD_LEVELS.map((m, i) => {
          const val      = i + 1;
          const isPicked = picking === val;
          return (
            <button
              key={val}
              onClick={() => save(val)}
              disabled={saving}
              title={m.label}
              className={`logger-btn ${isPicked ? 'logger-btn-picked' : ''}`}
              style={isPicked ? { background: `${m.color}30`, borderColor: m.color } : undefined}
            >
              <img src={emojiImgSrc(m.emoji)} alt={m.label} width={16} height={16} style={{ display: 'block' }} />
            </button>
          );
        })}
      </div>
      <p className="snap-sub" style={{ marginTop: 8 }}>
        Tap an emoji — that&apos;s it.
      </p>

      <ClientStyle>{`
        .snap-logger { gap: 4px; }
        .snap-logger-prompt {
          font-size: 14px;
          margin: 0 0 12px;
          color: var(--color-text);
          font-weight: 500;
        }
        .logger-row {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 3px;
          width: 100%;
        }
        .logger-btn {
          display: flex; align-items: center; justify-content: center;
          padding: 6px 0;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.12s ease;
        }
        .logger-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: var(--color-border-2);
        }
        .logger-btn:disabled { cursor: progress; opacity: 0.6; }
        .logger-btn-picked { transform: scale(1.08); }
        @media (max-width: 540px) {
          .logger-row { grid-template-columns: repeat(5, 1fr); }
        }
      `}</ClientStyle>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────
function SnapshotSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div
      className="snap-card"
      style={{
        background: 'var(--color-surface)',
        animation: 'shimmer 1.5s ease-in-out infinite',
        minHeight: tall ? 168 : 132,
      }}
    >
      <ClientStyle>{`@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }`}</ClientStyle>
    </div>
  );
}

function InsightIcon({ kind }: { kind: string }) {
  if (kind === 'up')    return <TrendingUp size={13} />;
  if (kind === 'down')  return <TrendingDown size={13} />;
  if (kind === 'flame') return <Flame size={13} />;
  return <Minus size={13} />;
}

function greetingFor(hour: number): string {
  if (hour < 5)  return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
