'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/sidebar';
import { TimeOfDayIcon, getIconStyle, setIconStyle, type IconStyle } from '@/components/time-of-day-icon';
import { getTimeOfDay } from '@/hooks/use-user-context';
import { Camera, Mic, MapPin, Calendar, Bell, Check, X as XIcon } from 'lucide-react';

interface SettingsData {
  trustedContactName:  string;
  trustedContactPhone: string;
  userName:            string;
  shareLocation:       boolean;
}

const EMERGENCY_CONTACTS = [
  { name: 'iCall (TISS)',           number: '9152987821',  note: 'Mon–Sat 8am–10pm' },
  { name: 'Vandrevala Foundation',  number: '1860-2662-345', note: '24/7, multilingual' },
  { name: 'AASRA',                  number: '9820466627',  note: '24/7' },
  { name: 'Emergency (all)',        number: '112',          note: '24/7' },
];

interface Permissions { camera: boolean; microphone: boolean; location: boolean; notifications: boolean; calendar: boolean; }
const DEFAULT_PERMS: Permissions = { camera: false, microphone: false, location: false, notifications: false, calendar: true };

export default function SettingsClient({ initial }: { initial: SettingsData }) {
  const [form,      setForm]      = useState<SettingsData>(initial);
  const [saving,    setSaving]    = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [testMsg,   setTestMsg]   = useState<{ ok: boolean; message: string } | null>(null);

  // Icon-style toggle + permissions display
  const [iconStyle, setIconStyleState] = useState<IconStyle>('animated');
  const [perms,     setPerms]     = useState<Permissions>(DEFAULT_PERMS);

  useEffect(() => {
    setIconStyleState(getIconStyle());
    try {
      const raw = localStorage.getItem('harmony-permissions');
      if (raw) setPerms({ ...DEFAULT_PERMS, ...JSON.parse(raw) });
    } catch { /* */ }
  }, []);

  function changeIconStyle(s: IconStyle) {
    setIconStyleState(s);
    setIconStyle(s);
  }

  function setField<K extends keyof SettingsData>(key: K, val: SettingsData[K]) {
    setForm((p) => ({ ...p, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          trustedContactName:  form.trustedContactName  || null,
          trustedContactPhone: form.trustedContactPhone || null,
          userName:            form.userName            || null,
          shareLocation:       form.shareLocation,
        }),
      });
      if (res.ok) {
        setSaved(true);
        toast.success('Settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      await handleSave();
      const res  = await fetch('/api/crisis-alert/test', { method: 'POST' });
      const data = await res.json();
      setTestMsg({ ok: data.ok, message: data.message });
      if (data.ok) toast.success('Test alert sent');
      else toast.error(data.message || 'Test alert failed');
    } catch {
      toast.error('Failed to send test alert');
    } finally {
      setTesting(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background:   'var(--color-surface)',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding:      '1.5rem',
    marginBottom: '1.25rem',
  };
  const label: React.CSSProperties = {
    display:      'block',
    fontSize:     13,
    color:        'var(--color-muted)',
    marginBottom: 6,
    fontWeight:   500,
  };
  const input: React.CSSProperties = {
    width:        '100%',
    padding:      '10px 14px',
    background:   'var(--color-surface-2)',
    border:       '1px solid var(--color-border-2)',
    borderRadius: 'var(--radius-md)',
    color:        'var(--color-text)',
    fontSize:     14,
    outline:      'none',
    fontFamily:   'inherit',
    marginBottom: '1rem',
  };

  const currentTod = getTimeOfDay();
  const permLabels: Array<{ key: keyof Permissions; label: string; icon: React.ReactNode; auto?: boolean }> = [
    { key: 'location',      label: 'Location',       icon: <MapPin size={14} /> },
    { key: 'camera',        label: 'Camera',         icon: <Camera size={14} /> },
    { key: 'microphone',    label: 'Microphone',     icon: <Mic size={14} /> },
    { key: 'calendar',      label: 'Calendar',       icon: <Calendar size={14} />, auto: true },
    { key: 'notifications', label: 'Notifications',  icon: <Bell size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '2.5rem 2rem 3rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, marginBottom: 4, fontFamily: "Georgia, 'Fraunces', serif" }}>Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>Crisis alerts, appearance & preferences</p>
      </div>

      {/* ── Appearance: icon style picker ── */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Time-of-day icon</h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          The icon that appears in your greetings. It shifts through the day with the sky.
          Pick the look you prefer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {(['custom', 'animated', 'twemoji'] as IconStyle[]).map((s) => {
            const active = iconStyle === s;
            return (
              <button
                key={s}
                onClick={() => changeIconStyle(s)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '14px 8px',
                  background: active ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-2))' : 'var(--color-surface-2)',
                  border: active ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--color-text)',
                  transition: 'all 0.15s',
                }}
              >
                <TimeOfDayIcon tod={currentTod} size={44} style={s} />
                <span style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                  {s === 'custom' ? 'Hand-drawn' : s === 'animated' ? 'Animated' : 'Twemoji'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Permissions status ── */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Connected services</h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Real-time signals Harmony has access to. Change at your browser&apos;s site-settings level to revoke.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {permLabels.map((p) => {
            const on = perms[p.key];
            return (
              <div key={p.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
              }}>
                <span style={{ color: on ? '#34d399' : 'var(--color-muted)', display: 'flex' }}>{p.icon}</span>
                <span style={{ flex: 1 }}>{p.label}</span>
                {p.auto ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    padding: '2px 6px', borderRadius: 4,
                    background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                    color: 'var(--color-primary)', textTransform: 'uppercase',
                  }}>Auto</span>
                ) : on ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                    <Check size={13} /> On
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-subtle)', fontSize: 12 }}>
                    <XIcon size={13} /> Off
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trusted contact */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1.25rem' }}>
          Trusted contact
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          If Harmony detects you&apos;re in distress, this person will be sent a caring SMS on your behalf.
        </p>

        <label style={label}>Their name</label>
        <input
          style={input}
          placeholder="e.g. Priya"
          value={form.trustedContactName}
          onChange={(e) => setField('trustedContactName', e.target.value)}
        />

        <label style={label}>Their Indian mobile number</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <span style={{
            padding: '10px 12px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            color: 'var(--color-muted)',
          }}>+91</span>
          <input
            style={{ ...input, marginBottom: 0, flex: 1 }}
            placeholder="9876543210"
            maxLength={10}
            value={form.trustedContactPhone}
            onChange={(e) => setField('trustedContactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>

        <label style={label}>Your name (used in alerts)</label>
        <input
          style={input}
          placeholder="e.g. Naman"
          value={form.userName}
          onChange={(e) => setField('userName', e.target.value)}
        />
      </div>

      {/* Location toggle */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Share my location in crisis alerts</p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Includes a Google Maps link in the SMS so your contact can find you
          </p>
        </div>
        <button
          id="location-toggle"
          onClick={() => setField('shareLocation', !form.shareLocation)}
          style={{
            width:  48,
            height: 28,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: form.shareLocation ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)',
            transition: 'background 0.2s',
            position: 'relative',
            flexShrink: 0,
          }}
          aria-pressed={form.shareLocation}
          aria-label="Toggle location sharing"
        >
          <span style={{
            position: 'absolute',
            top: 4,
            left: form.shareLocation ? 24 : 4,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Save + Test */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
        <button
          id="save-settings"
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px',
            background: saved ? 'rgba(52,211,153,0.15)' : 'var(--color-primary)',
            border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none',
            borderRadius: 'var(--radius-md)',
            color: saved ? 'var(--color-success)' : '#fff',
            fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
        </button>
        <button
          id="send-test-alert"
          onClick={handleTest}
          disabled={testing}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 14, fontWeight: 500,
            cursor: testing ? 'not-allowed' : 'pointer',
          }}
        >
          {testing ? 'Sending…' : '📲 Send test alert'}
        </button>
      </div>

      {testMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: testMsg.ok ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${testMsg.ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
          fontSize: 13,
          color: testMsg.ok ? 'var(--color-success)' : 'var(--color-danger)',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
        }}>
          {testMsg.message}
        </div>
      )}

      {/* Emergency contacts */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1.25rem' }}>Emergency contacts</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {EMERGENCY_CONTACTS.map(({ name, number, note }) => (
            <a
              key={number}
              href={`tel:${number.replace(/\D/g, '')}`}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '12px 16px',
                background:     'var(--color-surface-2)',
                border:         '1px solid var(--color-border)',
                borderRadius:   'var(--radius-md)',
                textDecoration: 'none',
                color:          'var(--color-text)',
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{name}</p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{note}</p>
              </div>
              <span style={{ fontSize: 15, color: 'var(--color-primary)', fontWeight: 600 }}>
                {number}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Data export */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Your data</h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Export all your conversations and journal entries.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/api/export?format=json"
            style={{
              flex: 1, padding: '10px', textAlign: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)', fontSize: 13, textDecoration: 'none',
            }}
          >
            Export all (JSON)
          </a>
          <a
            href="/api/export?format=csv"
            style={{
              flex: 1, padding: '10px', textAlign: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)', fontSize: 13, textDecoration: 'none',
            }}
          >
            Journal (CSV)
          </a>
        </div>
      </div>

        </div>
      </main>
    </div>
  );
}
