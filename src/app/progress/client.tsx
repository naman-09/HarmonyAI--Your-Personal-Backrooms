'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Flame, MessageCircle, BookOpen, Download, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';

interface Stats {
  totalSessions:    number;
  activeSessions:   number;
  totalMessages:    number;
  journalEntries:   number;
  avgMood:          number | null;
  streak:           number;
  weeklyMoods:      { week: string; avg: number }[];
  sessionFrequency: { week: string; count: number }[];
  milestones:       { label: string; achieved: boolean }[];
}

export default function ProgressClient() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  // ── Insights derived from the stats ──────────────────────────
  const insight = useMemo(() => {
    if (!stats) return null;

    // Mood trend across the 4 weeks
    const moods = stats.weeklyMoods.filter((w) => w.avg > 0).map((w) => w.avg);
    let trend:    'up' | 'down' | 'flat' | 'new' = 'new';
    let trendPct: number | null = null;
    if (moods.length >= 2) {
      const recent = moods[moods.length - 1];
      const prior  = moods[0];
      const delta  = recent - prior;
      const pct    = (delta / prior) * 100;
      trendPct = Math.round(Math.abs(pct));
      trend = Math.abs(pct) < 8 ? 'flat' : pct > 0 ? 'up' : 'down';
    }

    // Headline message
    let headline = 'Just getting started';
    let subline  = 'Your first entries and sessions will build the picture here.';
    if (stats.totalSessions === 0 && stats.journalEntries === 0) {
      headline = 'Your story begins here';
      subline  = 'Start a conversation or log your mood — even a tiny step counts.';
    } else if (stats.streak >= 7) {
      headline = `${stats.streak}-day journaling streak 🔥`;
      subline  = "Showing up consistently is the real work. Keep going.";
    } else if (trend === 'up' && trendPct) {
      headline = `Trending up by ${trendPct}%`;
      subline  = 'Your average mood is higher than four weeks ago. Notice what helped.';
    } else if (trend === 'down' && trendPct) {
      headline = "It's been a heavier stretch";
      subline  = `Your mood is ${trendPct}% lower than four weeks ago. Reach out — this is what Harmony is for.`;
    } else if (trend === 'flat') {
      headline = 'Steady waters';
      subline  = "Stable patterns are valuable too — they show you what 'normal' looks like.";
    } else if (stats.totalSessions > 0) {
      headline = `${stats.totalSessions} ${stats.totalSessions === 1 ? 'conversation' : 'conversations'} so far`;
      subline  = "Each one is a step you've chosen to take for yourself.";
    }

    return { headline, subline, trend, trendPct };
  }, [stats]);

  const achievedCount = stats?.milestones.filter((m) => m.achieved).length ?? 0;
  const totalMilestones = stats?.milestones.length ?? 0;

  function exportData(format: 'json' | 'csv') {
    window.location.href = `/api/export?format=${format}`;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="progress-main">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1>Your progress</h1>
            <p>Patterns over time — not a scorecard, just a mirror.</p>
          </div>
        </div>

      {loading ? (
        <ProgressSkeleton />
      ) : !stats ? (
        <div className="empty-progress">
          <p>We couldn&apos;t load your stats. Try refreshing.</p>
        </div>
      ) : (
        <>
          {/* ── Hero insight card ──────────────────────────── */}
          <section className="hero-card">
            <div className="hero-icon">
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="hero-headline">{insight?.headline}</h2>
              <p className="hero-subline">{insight?.subline}</p>
              {insight?.trend && insight.trend !== 'new' && (
                <div className={`trend-chip trend-chip-${insight.trend}`}>
                  {insight.trend === 'up'   && <><TrendingUp size={12} /> Improving</>}
                  {insight.trend === 'down' && <><TrendingDown size={12} /> Lower than usual</>}
                  {insight.trend === 'flat' && <><Minus size={12} /> Steady</>}
                </div>
              )}
            </div>
          </section>

          {/* ── At-a-glance stats ──────────────────────────── */}
          <div className="glance-grid">
            <GlanceCard
              icon={<MessageCircle size={16} />}
              label="Conversations"
              value={stats.totalSessions}
              sub={stats.activeSessions > 0 ? `${stats.activeSessions} active` : undefined}
            />
            <GlanceCard
              icon={<BookOpen size={16} />}
              label="Journal entries"
              value={stats.journalEntries}
            />
            <GlanceCard
              icon={<Flame size={16} />}
              label="Day streak"
              value={stats.streak}
              accent={stats.streak > 0}
            />
            <GlanceCard
              icon={<Award size={16} />}
              label="Milestones"
              value={`${achievedCount}/${totalMilestones}`}
            />
          </div>

          {/* ── Mood gauge ─────────────────────────────────── */}
          {stats.avgMood !== null && (
            <section className="mood-gauge-card">
              <div className="gauge-row">
                <div>
                  <p className="section-eyebrow">Overall mood</p>
                  <div className="gauge-value">
                    <span className="gauge-num">{stats.avgMood}</span>
                    <span className="gauge-den">/ 10</span>
                  </div>
                </div>
                <div className="gauge-feeling">{moodFeelingLabel(stats.avgMood)}</div>
              </div>
              <div className="gauge-track">
                <div
                  className="gauge-fill"
                  style={{
                    width: `${stats.avgMood * 10}%`,
                    background: moodColor(stats.avgMood),
                  }}
                />
              </div>
              <div className="gauge-scale">
                <span>Tough</span>
                <span>Okay</span>
                <span>Great</span>
              </div>
            </section>
          )}

          {/* ── Mood trend (4 weeks) ───────────────────────── */}
          {stats.weeklyMoods.some((w) => w.avg > 0) && (
            <section className="chart-card">
              <div className="chart-head">
                <p className="section-eyebrow">Mood over 4 weeks</p>
                <span className="chart-hint">avg per week (1–10)</span>
              </div>
              <div className="chart-canvas chart-canvas-tall">
                {[10, 7.5, 5, 2.5, 0].map((v) => (
                  <div key={v} className="chart-grid-line" style={{ bottom: `${v * 10}%` }}>
                    <span className="chart-grid-label">{v}</span>
                  </div>
                ))}
                <div className="chart-bars">
                  {stats.weeklyMoods.map((w, i) => (
                    <div key={i} className="chart-col">
                      <div className="chart-bar-wrap">
                        {w.avg > 0 && (
                          <span className="chart-bar-value">{w.avg.toFixed(1)}</span>
                        )}
                        <div
                          className="chart-bar"
                          style={{
                            height: w.avg > 0 ? `${w.avg * 10}%` : '2%',
                            background: w.avg > 0 ? moodColor(w.avg) : 'var(--color-border-2)',
                            opacity: w.avg > 0 ? 1 : 0.4,
                          }}
                        />
                      </div>
                      <span className="chart-col-label">{w.week}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Session frequency ──────────────────────────── */}
          {stats.sessionFrequency.some((w) => w.count > 0) && (
            <section className="chart-card">
              <div className="chart-head">
                <p className="section-eyebrow">Conversations per week</p>
                <span className="chart-hint">last 4 weeks</span>
              </div>
              <div className="chart-canvas">
                <div className="chart-bars">
                  {stats.sessionFrequency.map((w, i) => {
                    const max = Math.max(...stats.sessionFrequency.map((s) => s.count), 1);
                    return (
                      <div key={i} className="chart-col">
                        <div className="chart-bar-wrap">
                          {w.count > 0 && <span className="chart-bar-value">{w.count}</span>}
                          <div
                            className="chart-bar chart-bar-session"
                            style={{
                              height: w.count > 0 ? `${(w.count / max) * 90}%` : '2%',
                              opacity: w.count > 0 ? 1 : 0.3,
                            }}
                          />
                        </div>
                        <span className="chart-col-label">{w.week}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ── Milestones — visual progress bar ───────────── */}
          {totalMilestones > 0 && (
            <section className="milestones-card">
              <div className="milestones-head">
                <p className="section-eyebrow">Milestones</p>
                <span className="milestones-count">{achievedCount} of {totalMilestones}</span>
              </div>
              <div className="milestones-progress">
                <div
                  className="milestones-progress-fill"
                  style={{ width: `${(achievedCount / totalMilestones) * 100}%` }}
                />
              </div>
              <div className="milestones-list">
                {stats.milestones.map((m, i) => (
                  <div
                    key={i}
                    className={`milestone-row ${m.achieved ? 'milestone-row-on' : ''}`}
                  >
                    <div className="milestone-check">
                      {m.achieved ? <Award size={14} /> : <span className="milestone-pending" />}
                    </div>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Export ─────────────────────────────────────── */}
          <section className="export-card">
            <div className="export-head">
              <div>
                <p className="export-title">Your data is yours</p>
                <p className="export-sub">Download anytime, in any format.</p>
              </div>
              <Download size={18} className="export-icon" />
            </div>
            <div className="export-buttons">
              <button onClick={() => exportData('json')} className="export-btn">
                <span className="export-btn-name">Everything</span>
                <span className="export-btn-format">JSON</span>
              </button>
              <button onClick={() => exportData('csv')} className="export-btn">
                <span className="export-btn-name">Journal only</span>
                <span className="export-btn-format">CSV</span>
              </button>
            </div>
          </section>

          <p className="footer-note">
            Progress here is private to you. Harmony never shares your data.
          </p>
        </>
      )}

      {/* ── Styles ─────────────────────────────────────────── */}
      <style>{`
        .progress-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 2.5rem 2rem 3rem;
        }
        .progress-main > * { max-width: 640px; margin-left: auto; margin-right: auto; }
        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; margin-bottom: 1.5rem;
        }
        .page-header h1 {
          font-size: 26px; font-weight: 500; margin: 0 0 4px;
          font-family: Georgia, 'Fraunces', serif;
        }
        .page-header p { font-size: 14px; color: var(--color-muted); margin: 0; }
        .back-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; color: var(--color-muted);
          background: none; border: none; cursor: pointer; padding: 6px 10px;
          border-radius: var(--radius-sm);
        }
        .back-link:hover { color: var(--color-text); background: var(--color-surface); }

        .section-eyebrow {
          font-size: 11px; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--color-muted);
          font-weight: 600; margin: 0 0 0.5rem;
        }

        /* ── Hero card ── */
        .hero-card {
          display: flex; gap: 14px;
          padding: 1.5rem;
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)),
            var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
          border-radius: var(--radius-lg);
          margin-bottom: 1.25rem;
        }
        .hero-icon {
          width: 38px; height: 38px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--color-primary) 18%, transparent);
          color: var(--color-primary);
          border-radius: 50%;
        }
        .hero-headline {
          font-size: 19px; font-weight: 600;
          margin: 0 0 4px;
          font-family: Georgia, 'Fraunces', serif;
          line-height: 1.3;
        }
        .hero-subline {
          font-size: 13.5px; color: var(--color-muted);
          margin: 0; line-height: 1.55;
        }
        .trend-chip {
          display: inline-flex; align-items: center; gap: 4px;
          margin-top: 10px;
          padding: 3px 9px;
          font-size: 11px; font-weight: 600;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }
        .trend-chip-up   { background: rgba(52,211,153,0.14); color: #34d399; }
        .trend-chip-down { background: rgba(251,146,60,0.14); color: #fb923c; }
        .trend-chip-flat { background: rgba(148,163,184,0.14); color: #94a3b8; }

        /* ── Glance grid ── */
        .glance-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 1.25rem;
        }
        .glance-card {
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .glance-card-accent {
          background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
        }
        .glance-card-head {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 500;
          color: var(--color-muted);
          margin-bottom: 8px;
        }
        .glance-card-accent .glance-card-head { color: var(--color-primary); }
        .glance-card-num { font-size: 24px; font-weight: 600; line-height: 1; }
        .glance-card-sub { font-size: 11.5px; color: var(--color-subtle); margin-top: 4px; }

        /* ── Mood gauge ── */
        .mood-gauge-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .gauge-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 14px;
        }
        .gauge-value {
          display: flex; align-items: baseline; gap: 4px;
        }
        .gauge-num { font-size: 38px; font-weight: 600; line-height: 1; }
        .gauge-den { font-size: 14px; color: var(--color-subtle); }
        .gauge-feeling {
          font-size: 13px; font-weight: 600;
          color: var(--color-muted);
          font-style: italic;
        }
        .gauge-track {
          width: 100%; height: 10px;
          background: var(--color-bg);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .gauge-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s;
        }
        .gauge-scale {
          display: flex; justify-content: space-between;
          font-size: 11px; color: var(--color-subtle);
        }

        /* ── Chart cards ── */
        .chart-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .chart-head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 1rem;
        }
        .chart-hint {
          font-size: 11px; color: var(--color-subtle); font-weight: 500;
        }
        .chart-canvas {
          position: relative;
          height: 120px;
          padding-left: 22px;
        }
        .chart-canvas-tall { height: 160px; }
        .chart-grid-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: var(--color-border);
          opacity: 0.35;
        }
        .chart-grid-line:first-child { background: var(--color-border-2); opacity: 1; }
        .chart-grid-label {
          position: absolute;
          left: 0;
          bottom: -6px;
          transform: translateX(-100%);
          padding-right: 4px;
          font-size: 10px;
          color: var(--color-subtle);
        }
        .chart-bars {
          position: absolute;
          left: 22px; right: 0; bottom: 0; top: 0;
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .chart-col {
          flex: 1;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          height: 100%;
          justify-content: flex-end;
        }
        .chart-bar-wrap {
          width: 100%;
          max-width: 48px;
          flex: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          position: relative;
        }
        .chart-bar-value {
          position: absolute;
          top: -16px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--color-muted);
        }
        .chart-bar {
          width: 100%;
          border-radius: 5px 5px 2px 2px;
          transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
        }
        .chart-bar-session { background: #34d399; }
        .chart-col-label {
          font-size: 10.5px;
          color: var(--color-subtle);
          font-weight: 500;
        }

        /* ── Milestones ── */
        .milestones-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .milestones-head {
          display: flex; align-items: baseline; justify-content: space-between;
        }
        .milestones-count {
          font-size: 11.5px; color: var(--color-muted); font-weight: 600;
        }
        .milestones-progress {
          width: 100%; height: 6px;
          background: var(--color-bg);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .milestones-progress-fill {
          height: 100%;
          background: linear-gradient(to right, var(--color-primary), color-mix(in srgb, var(--color-primary) 65%, #34d399));
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .milestones-list {
          display: flex; flex-direction: column; gap: 6px;
        }
        .milestone-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px;
          background: var(--color-bg);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--color-muted);
          transition: all 0.15s;
        }
        .milestone-row-on {
          background: color-mix(in srgb, #34d399 8%, var(--color-bg));
          color: var(--color-text);
        }
        .milestone-check {
          width: 22px; height: 22px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: var(--color-surface);
          color: var(--color-subtle);
        }
        .milestone-row-on .milestone-check {
          background: rgba(52,211,153,0.18);
          color: #34d399;
        }
        .milestone-pending {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--color-border-2);
        }

        /* ── Export card ── */
        .export-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .export-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.9rem;
        }
        .export-title { font-size: 14px; font-weight: 600; margin: 0; }
        .export-sub   { font-size: 12.5px; color: var(--color-muted); margin: 2px 0 0; }
        .export-icon  { color: var(--color-muted); }
        .export-buttons {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }
        .export-btn {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }
        .export-btn:hover {
          border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg));
        }
        .export-btn-name { font-weight: 500; }
        .export-btn-format {
          font-size: 10px;
          color: var(--color-subtle);
          font-weight: 700;
          letter-spacing: 0.05em;
          background: var(--color-surface);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .empty-progress {
          padding: 3rem 1rem; text-align: center;
          color: var(--color-muted);
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
        }

        .footer-note {
          font-size: 11.5px;
          color: var(--color-subtle);
          text-align: center;
          line-height: 1.6;
          margin-top: 2rem;
        }

        @media (max-width: 540px) {
          .progress-main { padding: 1.25rem 1rem 2rem; }
          .glance-grid { gap: 6px; }
          .glance-card { padding: 12px 14px; }
        }

        /* ── App shell (shared with sidebar) ── */
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }
      `}</style>
      </main>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function moodColor(value: number): string {
  // Interpolates between mood emoji colors used in journal
  if (value >= 9) return '#bcc73a';
  if (value >= 7) return '#d4a052';
  if (value >= 5) return '#c8915a';
  if (value >= 3) return '#9388dd';
  return '#6366f1';
}

function moodFeelingLabel(value: number): string {
  if (value >= 9) return 'Glowing weeks';
  if (value >= 7) return 'Good place';
  if (value >= 5) return 'Mostly okay';
  if (value >= 3) return 'Heavy days';
  return 'A tough stretch';
}

function GlanceCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`glance-card ${accent ? 'glance-card-accent' : ''}`}>
      <div className="glance-card-head">
        {icon}
        <span>{label}</span>
      </div>
      <p className="glance-card-num">{value}</p>
      {sub && <p className="glance-card-sub">{sub}</p>}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skel skel-tall" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[1, 2, 3, 4].map((i) => <div key={i} className="skel skel-short" />)}
      </div>
      <div className="skel skel-med" />
      <div className="skel skel-tall" />
      <style>{`
        .skel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .skel-tall  { height: 140px; }
        .skel-med   { height: 110px; }
        .skel-short { height: 80px;  }
        @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }
      `}</style>
    </div>
  );
}
