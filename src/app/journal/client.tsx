'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Flame, TrendingUp, BookText } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { ClientStyle } from '@/components/client-style';

interface JournalEntry {
  id:   number;
  mood: number;
  note: string | null;
  date: string;
}

// ── Mood scale: 10 distinct emotional states, not just emoji ─────
interface MoodLevel {
  emoji: string;
  label: string;
  color: string;  // gentle gradient from indigo → terracotta → gold
}
const MOOD_LEVELS: MoodLevel[] = [
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
    .filter(n => n !== 0xFE0F)             // strip variation selector-16
    .map(n => n.toString(16))
    .join('-');
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${cp}.png`;
}

function dateToStr(d: Date): string {
  // Always use local-day calendar boundaries, not UTC's
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(dateStr: string): string {
  const today = dateToStr(new Date());
  const yest  = dateToStr(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yest)  return 'Yesterday';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function JournalClient() {
  const [entries, setEntries]       = useState<JournalEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeDate, setActiveDate] = useState(() => dateToStr(new Date()));
  const [mood, setMood]             = useState<number | null>(null);  // 1-based; null = not selected yet
  const [note, setNote]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const todayStr = dateToStr(new Date());
  const isToday = activeDate === todayStr;
  const activeEntry = entries.find((e) => e.date === activeDate);

  // ── Load 30 days of history ──────────────────────────────────
  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    fetch(`/api/journal?from=${dateToStr(from)}&to=${todayStr}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [todayStr]);

  // ── Sync the editor with the active date's entry ─────────────
  useEffect(() => {
    if (activeEntry) {
      setMood(activeEntry.mood);
      setNote(activeEntry.note ?? '');
    } else {
      setMood(null);
      setNote('');
    }
  }, [activeDate, activeEntry]);

  // ── Save / update ────────────────────────────────────────────
  async function handleSave() {
    if (!mood) {
      toast.error('Pick a mood first');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, note: note || undefined, date: activeDate }),
      });
      if (!res.ok) throw new Error();
      toast.success(activeEntry ? 'Updated' : 'Saved');
      setEntries((prev) => {
        if (activeEntry) {
          return prev.map((e) =>
            e.date === activeDate ? { ...e, mood, note } : e,
          );
        }
        return [{ id: Date.now(), mood, note, date: activeDate }, ...prev];
      });
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ── Stats ────────────────────────────────────────────────────
  const last7 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    return entries
      .filter((e) => new Date(e.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = dateToStr(d);
      if (entries.some((e) => e.date === ds)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        if (i === 0 && !entries.some((e) => e.date === dateToStr(new Date()))) {
          // give today a chance — only break the streak if yesterday is also missing
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return count;
  }, [entries]);

  const avg7 = last7.length > 0
    ? +(last7.reduce((s, e) => s + e.mood, 0) / last7.length).toFixed(1)
    : null;

  // Build last-7-days array including missing days for the chart
  const chart7 = useMemo(() => {
    const arr: Array<{ date: string; mood: number | null }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = dateToStr(d);
      const e  = entries.find((x) => x.date === ds);
      arr.push({ date: ds, mood: e?.mood ?? null });
    }
    return arr;
  }, [entries]);

  // ── Date nav handlers ───────────────────────────────────────
  function shiftDate(delta: number) {
    const d = new Date(activeDate);
    d.setDate(d.getDate() + delta);
    const ds = dateToStr(d);
    if (ds > todayStr) return;  // can't backdate to the future
    setActiveDate(ds);
  }

  const moodLevel = mood ? MOOD_LEVELS[mood - 1] : null;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="journal-main">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1>Mood Journal</h1>
            <p>One check-in. Two minutes. Compounds over weeks.</p>
          </div>
        </div>

      {/* ── Stat strip ──────────────────────────────────────── */}
      <div className="stat-strip">
        <StatPill icon={<Flame size={14} />} label="Day streak" value={streak} accent={streak > 0} />
        <StatPill icon={<TrendingUp size={14} />} label="7-day avg" value={avg7 ?? '—'} />
        <StatPill icon={<BookText size={14} />} label="Entries" value={entries.length} />
      </div>

      {/* ── Date pager ─────────────────────────────────────── */}
      <div className="date-pager">
        <button
          onClick={() => shiftDate(-1)}
          className="date-pager-btn"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="date-pager-text">
          <p className="date-pager-pretty">{prettyDate(activeDate)}</p>
          <p className="date-pager-iso">{activeDate}</p>
          {!isToday && (
            <button onClick={() => setActiveDate(todayStr)} className="date-pager-jump">
              Jump to today
            </button>
          )}
        </div>
        <button
          onClick={() => shiftDate(1)}
          className="date-pager-btn"
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Mood entry card ────────────────────────────────── */}
      <section
        className="journal-card"
        style={{
          // Gentle tint matching the chosen mood
          borderColor: moodLevel
            ? `color-mix(in srgb, ${moodLevel.color} 35%, var(--color-border))`
            : 'var(--color-border)',
        }}
      >
        <p className="journal-prompt">
          {isToday
            ? activeEntry ? 'How are you feeling now?' : 'How are you feeling today?'
            : activeEntry ? `How did you feel on ${prettyDate(activeDate)}?` : `Add an entry for ${prettyDate(activeDate)}`}
        </p>

        {/* Big preview of selection */}
        {moodLevel && (
          <div className="mood-preview" style={{ color: moodLevel.color }}>
            <img
              src={emojiImgSrc(moodLevel.emoji)}
              alt={moodLevel.label}
              width={44} height={44}
              className="mood-preview-emoji"
            />
            <span className="mood-preview-label">{moodLevel.label}</span>
          </div>
        )}

        {/* Emoji grid — 5-column, emoji + label */}
        <div className="journal-mood-grid" role="radiogroup" aria-label="Mood">
          {MOOD_LEVELS.map((m, i) => {
            const value    = i + 1;
            const selected = mood === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={selected}
                aria-label={`${value} – ${m.label}`}
                title={`${value} – ${m.label}`}
                onClick={() => setMood(value)}
                className={`journal-mood-btn ${selected ? 'journal-mood-btn-picked' : ''}`}
                style={selected ? {
                  background: `${m.color}28`,
                  borderColor: m.color,
                } : undefined}
              >
                <img src={emojiImgSrc(m.emoji)} alt={m.label} width={22} height={22} style={{ display: 'block' }} />
                <span style={{ fontSize: 10.5, color: selected ? m.color : 'var(--color-muted)', fontWeight: selected ? 600 : 400 }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <label className="note-label" htmlFor="journal-note">
          Anything you want to remember about today? <span className="note-optional">(optional)</span>
        </label>
        <textarea
          id="journal-note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 2000))}
          placeholder="A few words (optional) — what was happening today?"
          rows={3}
          className="journal-note"
        />
        <div className="note-footer">
          <span className={`note-count ${note.length > 1800 ? 'note-count-warn' : ''}`}>
            {note.length}/2000
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !mood}
            className="journal-save"
          >
            {saving ? 'Saving…' : activeEntry ? 'Update entry' : 'Save entry'}
          </button>
        </div>
      </section>

      {/* ── 7-day bar chart ────────────────────────────────── */}
      <section className="chart-card">
        <div className="trend-head">
          <p className="section-eyebrow" style={{ marginBottom: 10 }}>Last 7 days</p>
          {avg7 !== null && (
            <span className="trend-avg">avg {avg7}/10</span>
          )}
        </div>
        <div className="chart-row" aria-hidden>
          {chart7.map((d, i) => {
            const lvl = d.mood ? MOOD_LEVELS[d.mood - 1] : null;
            const h = d.mood ? Math.round((d.mood / 10) * 80) + 4 : 4;
            const day = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' });
            const isActive = d.date === activeDate;
            return (
              <button
                key={i}
                onClick={() => setActiveDate(d.date)}
                className={`chart-bar-wrap ${isActive ? 'chart-bar-active' : ''}`}
                title={`${prettyDate(d.date)}${d.mood ? ` — ${lvl!.label} (${d.mood}/10)` : ' — no entry'}`}
              >
                <div
                  className="chart-bar"
                  style={{ height: `${h}px`, background: lvl?.color ?? 'rgba(255,255,255,0.06)' }}
                />
                <span className="chart-bar-day">
                  {d.date === todayStr ? 'T' : day[0]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Recent entries (expandable to read full note) ── */}
      <section>
        <p className="section-eyebrow">Recent entries</p>
        {loading ? (
          <div className="entries-loading">
            {[1, 2, 3].map((i) => <div key={i} className="entry-skeleton" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="entries-empty">
            <p>No entries yet.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Your first one is right above ↑</p>
          </div>
        ) : (
          <div className="entries-list">
            {entries.slice(0, 14).map((e) => {
              const level = MOOD_LEVELS[e.mood - 1];
              const open  = expandedId === e.id;
              const hasNote = !!e.note?.trim();
              return (
                <div key={e.id} className={`entry-item ${open ? 'entry-item-open' : ''}`}>
                  <button
                    onClick={() => {
                      if (!hasNote) {
                        // No note → tapping just navigates the editor to that date
                        setActiveDate(e.date);
                        return;
                      }
                      setExpandedId(open ? null : e.id);
                    }}
                    className="entry-row"
                    style={{
                      borderLeftColor: level.color,
                    }}
                  >
                    <span className="entry-emoji" style={{ background: `${level.color}1f` }}>
                      <img src={emojiImgSrc(level.emoji)} alt={level.label} width={20} height={20} />
                    </span>
                    <div className="entry-text">
                      <div className="entry-meta">
                        <strong className="entry-mood-label" style={{ color: level.color }}>
                          {level.label}
                        </strong>
                        <span className="entry-mood-num">·</span>
                        <span className="entry-mood-num">{e.mood}/10</span>
                        <span className="entry-mood-num">·</span>
                        <span className="entry-mood-num">{prettyDate(e.date)}</span>
                      </div>
                      {hasNote && !open && (
                        <p className="entry-preview">{e.note}</p>
                      )}
                    </div>
                    {hasNote && (
                      <ChevronRight
                        size={16}
                        className="entry-chevron"
                        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)' }}
                      />
                    )}
                  </button>
                  {open && hasNote && (
                    <div className="entry-expanded">
                      <p>{e.note}</p>
                      <button onClick={() => setActiveDate(e.date)} className="entry-edit-link">
                        Edit this entry →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Styles ─────────────────────────────────────────── */}
      <ClientStyle>{`
        .journal-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 2.5rem 2rem 3rem;
        }
        .journal-main > * { max-width: 640px; margin-left: auto; margin-right: auto; }
        .app-shell { display: flex; min-height: 100vh; background: var(--color-bg); }
        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; margin-bottom: 1.5rem;
        }
        .page-header h1 {
          font-size: clamp(1.6rem, 3.2vw, 2.1rem); font-weight: 400; margin: 0 0 4px;
          font-family: var(--font-serif);
          letter-spacing: -0.01em; line-height: 1.1;
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
          font-weight: 600; margin: 0 0 0.65rem;
        }

        /* ── Stat strip ── */
        .stat-strip {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin: 24px 0;
        }
        .stat-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }
        .stat-pill-accent {
          background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
        }
        .stat-pill-icon {
          width: 28px; height: 28px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-bg);
          border-radius: 50%;
          color: var(--color-primary);
        }
        .stat-pill-label { font-size: 11px; color: var(--color-muted); margin: 0; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500; }
        .stat-pill-value { font-size: 18px; font-weight: 600; margin: 0; font-variant-numeric: tabular-nums; }

        /* ── Date pager ── */
        .date-pager {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 12px; margin-bottom: 14px;
        }
        .date-pager-btn {
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: 1px solid transparent;
          border-radius: var(--radius-sm); color: var(--color-muted); cursor: pointer;
          transition: all 0.15s;
        }
        .date-pager-btn:hover:not(:disabled) { background: var(--color-bg); color: var(--color-primary); border-color: var(--color-border); }
        .date-pager-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .date-pager-text { text-align: center; }
        .date-pager-pretty { font-family: var(--font-serif); font-size: 18px; font-weight: 500; margin: 0; line-height: 1.1; letter-spacing: -0.005em; }
        .date-pager-iso { font-size: 11px; color: var(--color-subtle); margin: 2px 0 0; font-family: var(--font-mono, monospace); }
        .date-pager-jump {
          font-size: 11px; color: var(--color-primary);
          background: none; border: none; cursor: pointer;
          padding: 0; text-decoration: underline; display: block; margin-top: 2px;
        }

        /* ── Journal card ── */
        .journal-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 20px 22px;
          margin-bottom: 14px;
          transition: border-color 0.3s ease;
        }
        .journal-prompt {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 14px;
        }
        .mood-preview {
          text-align: center;
          margin-bottom: 1rem;
          transition: color 0.2s ease;
        }
        .mood-preview-emoji {
          display: block;
          width: 44px; height: 44px;
          margin: 0 auto;
          animation: moodPop 0.25s ease-out;
        }
        .mood-preview-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-top: 2px;
        }
        @keyframes moodPop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        .journal-mood-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          margin-bottom: 14px;
        }
        .journal-mood-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 4px;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.12s;
        }
        .journal-mood-btn:hover { border-color: var(--color-border-2); transform: translateY(-1px); }
        .journal-mood-btn-picked { transform: scale(1.04); }

        .note-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text);
          margin-bottom: 6px;
        }
        .note-optional { color: var(--color-subtle); font-weight: 400; }
        .journal-note {
          width: 100%;
          resize: vertical;
          min-height: 70px;
          padding: 10px 14px;
          background: var(--color-bg);
          border: 1px solid var(--color-border-2);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 13.5px;
          line-height: 1.55;
          outline: none;
          font-family: inherit;
          margin-bottom: 14px;
        }
        .journal-note:focus { border-color: var(--color-primary); }
        .note-footer {
          display: flex; align-items: center; justify-content: space-between;
        }
        .note-count {
          font-size: 11px; color: var(--color-subtle);
        }
        .note-count-warn { color: var(--color-warning); }
        .journal-save {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          background: var(--color-primary);
          color: #011a10;
          border: none;
          border-radius: 999px;
          font-size: 13.5px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          box-shadow: var(--shadow-cta);
        }
        .journal-save:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
        .journal-save:not(:disabled):hover { transform: translateY(-1px); }

        /* ── 7-day bar chart ── */
        .chart-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 18px 22px;
          margin-bottom: 1.5rem;
        }
        .trend-head {
          display: flex; align-items: baseline; justify-content: space-between;
        }
        .trend-avg {
          font-size: 11px; color: var(--color-muted); font-weight: 500;
        }
        .chart-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          align-items: end;
          height: 110px;
        }
        .chart-bar-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer; font-family: inherit;
          border-radius: var(--radius-sm);
          padding: 2px;
          transition: opacity 0.15s;
        }
        .chart-bar-wrap:hover { opacity: 0.8; }
        .chart-bar-active { outline: 1px solid var(--color-border); }
        .chart-bar {
          width: 70%;
          border-radius: 4px;
          transition: height 0.4s var(--ease-out, cubic-bezier(0.4,0,0.2,1));
        }
        .chart-bar-day {
          font-size: 11px; color: var(--color-muted); font-weight: 500;
        }

        /* ── Entries list ── */
        .entries-list {
          display: flex; flex-direction: column; gap: 6px;
        }
        .entry-item {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .entry-item:hover { border-color: var(--color-border-2); }
        .entry-item-open  { border-color: var(--color-border-2); }
        .entry-row {
          width: 100%;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: none;
          border: none;
          border-left: 3px solid var(--color-border);
          cursor: pointer;
          color: var(--color-text);
          font-family: inherit;
          text-align: left;
        }
        .entry-emoji {
          width: 36px; height: 36px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          border-radius: 50%;
        }
        .entry-text { flex: 1; min-width: 0; }
        .entry-meta {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .entry-mood-label { font-weight: 600; }
        .entry-mood-num   { font-size: 12px; color: var(--color-subtle); }
        .entry-preview {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--color-muted);
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .entry-chevron {
          color: var(--color-subtle);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .entry-expanded {
          padding: 8px 16px 14px 64px;
          background: color-mix(in srgb, var(--color-bg) 60%, transparent);
          animation: entryFade 0.2s ease-out;
        }
        .entry-expanded p {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--color-text);
          white-space: pre-wrap;
          margin: 0 0 0.5rem;
        }
        .entry-edit-link {
          font-size: 12px;
          color: var(--color-primary);
          background: none; border: none;
          cursor: pointer; padding: 0;
        }
        .entry-edit-link:hover { text-decoration: underline; }

        .entries-loading { display: flex; flex-direction: column; gap: 6px; }
        .entry-skeleton {
          height: 56px;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .entries-empty {
          padding: 1.5rem;
          text-align: center;
          color: var(--color-muted);
          font-size: 14px;
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
        }

        @keyframes entryFade {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 200px; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 0.8; }
        }

        @media (max-width: 540px) {
          .journal-main { padding: 1.25rem 1rem 2rem; }
          .journal-mood-grid { grid-template-columns: repeat(5, 1fr); }
          .stat-strip { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .stat-pill { padding: 10px 12px; }
        }
      `}</ClientStyle>
      </main>
    </div>
  );
}

function StatPill({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className={`stat-pill ${accent ? 'stat-pill-accent' : ''}`}>
      <span className="stat-pill-icon">{icon}</span>
      <div>
        <p className="stat-pill-label">{label}</p>
        <p className="stat-pill-value">{value}</p>
      </div>
    </div>
  );
}
