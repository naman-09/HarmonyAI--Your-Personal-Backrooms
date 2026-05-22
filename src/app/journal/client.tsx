'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const MOOD_EMOJIS = ['', '😞', '😔', '😟', '😐', '🙂', '😊', '😄', '😁', '🥳', '✨'];

interface JournalEntry {
  id:   number;
  mood: number;
  note: string | null;
  date: string;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function JournalClient() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood]       = useState(5);
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);

  const todayStr = today();
  const todayEntry = entries.find((e) => e.date === todayStr);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    fetch(`/api/journal?from=${from.toISOString().split('T')[0]}&to=${todayStr}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        const te = (d.entries ?? []).find((e: JournalEntry) => e.date === todayStr);
        if (te) { setMood(te.mood); setNote(te.note ?? ''); }
      })
      .finally(() => setLoading(false));
  }, [todayStr]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, note: note || undefined, date: todayStr }),
      });
      if (res.ok) {
        toast.success('Mood saved');
        const updated = todayEntry
          ? entries.map((e) => e.date === todayStr ? { ...e, mood, note } : e)
          : [{ id: 0, mood, note, date: todayStr }, ...entries];
        setEntries(updated);
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const last7 = entries.filter((e) => {
    const d = new Date(e.date);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    return d >= week;
  }).reverse();

  const avgMood = last7.length > 0
    ? (last7.reduce((s, e) => s + e.mood, 0) / last7.length).toFixed(1)
    : null;

  const streak = (() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (entries.find((e) => e.date === dateStr)) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  })();

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 580, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Mood Journal</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>Track how you&apos;re feeling</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Dashboard
        </button>
      </div>

      {/* Today's check-in */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.25rem',
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1.25rem' }}>
          {todayEntry ? 'Update today\'s mood' : 'How are you feeling today?'}
        </h2>

        {/* Mood slider */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>{MOOD_EMOJIS[mood]}</span>
            <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-primary)' }}>{mood}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            aria-label="Mood level"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-subtle)' }}>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 2000))}
          placeholder="What's on your mind today? (optional)"
          rows={3}
          style={{
            width: '100%',
            resize: 'none',
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: '1rem',
          }}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : todayEntry ? 'Update' : 'Save'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
        <div style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-primary)' }}>{streak}</p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Day streak</p>
        </div>
        <div style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-primary)' }}>{avgMood ?? '—'}</p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>7-day avg</p>
        </div>
        <div style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-primary)' }}>{entries.length}</p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Entries</p>
        </div>
      </div>

      {/* Mini chart */}
      {last7.length > 1 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Last 7 days</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {last7.map((e) => (
              <div key={e.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${e.mood * 8}px`,
                  background: `rgba(107,143,255,${0.3 + e.mood * 0.07})`,
                  borderRadius: 4,
                  transition: 'height 0.3s',
                }} />
                <span style={{ fontSize: 10, color: 'var(--color-subtle)' }}>
                  {new Date(e.date).toLocaleDateString('en-IN', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent entries */}
      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Loading…</p>
      ) : entries.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '0.75rem' }}>Recent entries</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.slice(0, 10).map((e) => (
              <div key={e.date} style={{
                padding: '12px 16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 24 }}>{MOOD_EMOJIS[e.mood]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{e.mood}/10</span>
                    <span style={{ fontSize: 12, color: 'var(--color-subtle)' }}>
                      {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {e.note && (
                    <p style={{
                      fontSize: 13, color: 'var(--color-muted)', marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {e.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
