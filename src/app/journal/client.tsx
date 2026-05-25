'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, TrendingUp, BookText } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

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
  const router = useRouter();
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
    <main className="journal-main">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Mood Journal</h1>
          <p>One check-in. Two minutes. Compounds over weeks.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThemeToggle size={16} />
          <button onClick={() => router.push('/dashboard')} className="back-link">
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>
      </div>

      {/* ── Stat strip ──────────────────────────────────────── */}
      <div className="stat-strip">
        <StatPill icon={<Flame size={15} />} label="Day streak" value={streak} accent={streak > 0} />
        <StatPill icon={<TrendingUp size={15} />} label="7-day avg" value={avg7 ?? '—'} />
        <StatPill icon={<BookText size={15} />} label="Entries" value={entries.length} />
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
        <div className="date-pager-label">
          <span className="date-pager-title">{prettyDate(activeDate)}</span>
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
        className="entry-card"
        style={{
          // Gentle tint matching the chosen mood
          borderColor: moodLevel
            ? `color-mix(in srgb, ${moodLevel.color} 35%, var(--color-border))`
            : 'var(--color-border)',
        }}
      >
        <p className="entry-prompt">
          {isToday
            ? activeEntry ? 'How are you feeling now?' : 'How are you feeling today?'
            : activeEntry ? `How did you feel on ${prettyDate(activeDate)}?` : `Add an entry for ${prettyDate(activeDate)}`}
        </p>

        {/* Big preview of selection */}
        {moodLevel && (
          <div className="mood-preview" style={{ color: moodLevel.color }}>
            <span className="mood-preview-emoji">{moodLevel.emoji}</span>
            <span className="mood-preview-label">{moodLevel.label}</span>
          </div>
        )}

        {/* Emoji grid — replaces the slider */}
        <div className="mood-grid" role="radiogroup" aria-label="Mood">
          {MOOD_LEVELS.map((m, i) => {
            const value    = i + 1;
            const selected = mood === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={selected}
                aria-label={m.label}
                title={`${value} – ${m.label}`}
                onClick={() => setMood(value)}
                className={`mood-btn ${selected ? 'mood-btn-on' : ''}`}
                style={selected ? {
                  borderColor: m.color,
                  background: `color-mix(in srgb, ${m.color} 18%, transparent)`,
                  boxShadow: `0 0 0 2px color-mix(in srgb, ${m.color} 25%, transparent)`,
                } : undefined}
              >
                <span className="mood-btn-emoji">{m.emoji}</span>
                <span className="mood-btn-num">{value}</span>
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
          placeholder="A win. A worry. A thought you keep coming back to…"
          rows={4}
          className="note-input"
        />
        <div className="note-footer">
          <span className={`note-count ${note.length > 1800 ? 'note-count-warn' : ''}`}>
            {note.length}/2000
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !mood}
            className="save-btn"
            style={mood ? { background: moodLevel?.color ?? 'var(--color-primary)' } : undefined}
          >
            {saving ? 'Saving…' : activeEntry ? 'Update entry' : 'Save entry'}
          </button>
        </div>
      </section>

      {/* ── 7-day trend chart ──────────────────────────────── */}
      <section className="trend-card">
        <div className="trend-head">
          <p className="section-eyebrow">Last 7 days</p>
          {avg7 !== null && (
            <span className="trend-avg">avg {avg7}/10</span>
          )}
        </div>
        <div className="trend-bars" aria-hidden>
          {chart7.map((d, i) => {
            const heightPct = d.mood ? d.mood * 10 : 6;
            const m = d.mood ? MOOD_LEVELS[d.mood - 1] : null;
            const isToday = d.date === todayStr;
            const isActive = d.date === activeDate;
            return (
              <button
                key={i}
                onClick={() => setActiveDate(d.date)}
                className={`trend-day ${isActive ? 'trend-day-active' : ''}`}
                title={`${prettyDate(d.date)}${d.mood ? ` — ${MOOD_LEVELS[d.mood - 1].label}` : ' — no entry'}`}
              >
                <span className="trend-day-emoji">
                  {m ? m.emoji : '○'}
                </span>
                <div className="trend-bar-track">
                  <div
                    className="trend-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: m?.color ?? 'var(--color-border-2)',
                      opacity: m ? 1 : 0.3,
                    }}
                  />
                </div>
                <span className={`trend-day-label ${isToday ? 'trend-day-label-today' : ''}`}>
                  {isToday ? 'Today' : new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
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
                      {level.emoji}
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
      <style>{`
        .journal-main {
          min-height: 100vh;
          padding: 2rem 1.5rem 3rem;
          max-width: 640px;
          margin: 0 auto;
        }
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
          font-weight: 600; margin: 0 0 0.65rem;
        }

        /* ── Stat strip ── */
        .stat-strip {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; margin-bottom: 1.25rem;
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
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
        }
        .stat-icon-wrap {
          display: flex; align-items: center; justify-content: center;
          color: var(--color-muted);
        }
        .stat-pill-accent .stat-icon-wrap { color: var(--color-primary); }
        .stat-pill-num { font-size: 18px; font-weight: 600; line-height: 1; }
        .stat-pill-lbl { font-size: 11px; color: var(--color-muted); margin-top: 2px; }

        /* ── Date pager ── */
        .date-pager {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 1rem;
        }
        .date-pager-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .date-pager-btn:hover:not(:disabled) {
          color: var(--color-text);
          border-color: var(--color-border-2);
        }
        .date-pager-btn:disabled {
          opacity: 0.35; cursor: not-allowed;
        }
        .date-pager-label {
          flex: 1; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .date-pager-title { font-size: 14px; font-weight: 600; }
        .date-pager-jump {
          font-size: 11px; color: var(--color-primary);
          background: none; border: none; cursor: pointer;
          padding: 0; text-decoration: underline;
        }

        /* ── Entry card ── */
        .entry-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          transition: border-color 0.3s ease;
        }
        .entry-prompt {
          font-size: 15px;
          font-weight: 500;
          margin: 0 0 0.5rem;
          text-align: center;
          font-family: Georgia, 'Fraunces', serif;
        }
        .mood-preview {
          text-align: center;
          margin-bottom: 1rem;
          transition: color 0.2s ease;
        }
        .mood-preview-emoji {
          display: block;
          font-size: 44px;
          line-height: 1.1;
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

        .mood-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 5px;
          margin: 0 auto 1.25rem;
        }
        .mood-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 7px 0 5px;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
          color: var(--color-text);
        }
        .mood-btn:hover {
          transform: translateY(-1px);
          border-color: var(--color-border-2);
        }
        .mood-btn-on {
          transform: translateY(-2px);
        }
        .mood-btn-emoji { font-size: 18px; line-height: 1; }
        .mood-btn-num   { font-size: 9px; color: var(--color-subtle); font-weight: 600; }
        .mood-btn-on .mood-btn-num { color: var(--color-text); }

        .note-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text);
          margin-bottom: 6px;
        }
        .note-optional { color: var(--color-subtle); font-weight: 400; }
        .note-input {
          width: 100%;
          resize: vertical;
          padding: 10px 14px;
          background: var(--color-bg);
          border: 1px solid var(--color-border-2);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 14px;
          line-height: 1.6;
          outline: none;
          font-family: inherit;
          min-height: 80px;
          transition: border-color 0.15s;
        }
        .note-input:focus { border-color: var(--color-primary); }
        .note-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 12px;
        }
        .note-count {
          font-size: 11px; color: var(--color-subtle);
        }
        .note-count-warn { color: var(--color-warning); }
        .save-btn {
          padding: 10px 22px;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-md);
          color: #fff;
          font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .save-btn:disabled {
          opacity: 0.4; cursor: not-allowed;
        }
        .save-btn:not(:disabled):hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }

        /* ── Trend chart ── */
        .trend-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem 1.25rem;
          margin-bottom: 1.5rem;
        }
        .trend-head {
          display: flex; align-items: baseline; justify-content: space-between;
        }
        .trend-avg {
          font-size: 11px; color: var(--color-muted); font-weight: 500;
        }
        .trend-bars {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-top: 0.5rem;
        }
        .trend-day {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 6px 2px 4px;
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .trend-day:hover {
          background: var(--color-bg);
        }
        .trend-day-active {
          background: var(--color-bg);
          border-color: var(--color-border);
        }
        .trend-day-emoji {
          font-size: 14px; height: 18px; line-height: 1;
          color: var(--color-subtle);
        }
        .trend-bar-track {
          width: 100%; max-width: 28px;
          height: 70px;
          background: var(--color-bg);
          border-radius: 4px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .trend-bar-fill {
          width: 100%;
          border-radius: 4px;
          transition: height 0.3s ease, background 0.2s;
        }
        .trend-day-label {
          font-size: 10px;
          color: var(--color-subtle);
          font-weight: 500;
        }
        .trend-day-label-today {
          color: var(--color-primary);
          font-weight: 600;
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
          .mood-grid { grid-template-columns: repeat(5, 1fr); }
          .stat-strip { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .stat-pill { padding: 10px 12px; }
        }
      `}</style>
    </main>
  );
}

function StatPill({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className={`stat-pill ${accent ? 'stat-pill-accent' : ''}`}>
      <span className="stat-icon-wrap">{icon}</span>
      <div>
        <div className="stat-pill-num">{value}</div>
        <div className="stat-pill-lbl">{label}</div>
      </div>
    </div>
  );
}
