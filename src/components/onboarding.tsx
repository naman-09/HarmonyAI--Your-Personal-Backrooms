'use client';

import { useState } from 'react';
import { Camera, Mic, MapPin, Calendar, Bell, Check, X as XIcon, Shield, Sparkles, MessageCircle } from 'lucide-react';

const PERM_KEY = 'harmony-permissions';

interface Permissions {
  camera:        boolean;
  microphone:    boolean;
  location:      boolean;
  notifications: boolean;
  /** Calendar awareness is automatic; we just record consent. */
  calendar:      boolean;
}

// ─── Intro slides (unchanged from before, kept brief) ────────
const slides = [
  {
    icon: <MessageCircle size={40} />,
    title: 'Welcome to Harmony',
    desc:  'A compassionate AI companion that listens, understands, and supports you — without judgement.',
  },
  {
    icon: <Shield size={40} />,
    title: 'Your safety matters',
    desc:  'Harmony has a built-in crisis detection system. If it senses you may be in danger, it can alert a trusted contact.',
  },
  {
    icon: <Sparkles size={40} />,
    title: 'Tools for your wellbeing',
    desc:  'Beyond conversation: mood journal, breathing exercises, and curated resources. Track patterns at your own pace.',
  },
];

// ─── Permissions checklist ────────────────────────────────────
interface PermItem {
  key:    keyof Permissions;
  icon:   React.ReactNode;
  label:  string;
  detail: string;
  /** How to actually request this permission from the browser. Returns true if granted. */
  request: () => Promise<boolean>;
  /** Calendar has no browser API — treated as automatic-consent. */
  automatic?: boolean;
}

const permItems: PermItem[] = [
  {
    key:    'location',
    icon:   <MapPin size={18} />,
    label:  'Location',
    detail: "Lets Harmony adapt the UI to your local weather and reference where you are.",
    request: async () => {
      if (!navigator.geolocation) return false;
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 10000, maximumAge: 300000 },
        );
      });
    },
  },
  {
    key:    'camera',
    icon:   <Camera size={18} />,
    label:  'Camera',
    detail: 'Optional. Used in chat for face-based emotion detection. You can turn it off anytime.',
    request: async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach((t) => t.stop()); // immediately release
        return true;
      } catch { return false; }
    },
  },
  {
    key:    'microphone',
    icon:   <Mic size={18} />,
    label:  'Microphone',
    detail: 'Optional. Used in chat for voice input and tone detection. Off by default.',
    request: async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        return true;
      } catch { return false; }
    },
  },
  {
    key:    'calendar',
    icon:   <Calendar size={18} />,
    label:  'Calendar awareness',
    detail: 'Automatic. Harmony references the date and day-of-week to ground conversations (no browser permission needed).',
    automatic: true,
    request: async () => true,
  },
  {
    key:    'notifications',
    icon:   <Bell size={18} />,
    label:  'Notifications',
    detail: 'Optional. Gentle reminders for your daily mood check-in.',
    request: async () => {
      if (!('Notification' in window)) return false;
      try {
        const r = await Notification.requestPermission();
        return r === 'granted';
      } catch { return false; }
    },
  },
];

function loadPerms(): Permissions {
  try {
    const raw = localStorage.getItem(PERM_KEY);
    if (raw) return { ...defaultPerms, ...JSON.parse(raw) };
  } catch { /* */ }
  return defaultPerms;
}

const defaultPerms: Permissions = {
  camera: false, microphone: false, location: false, notifications: false, calendar: true,
};

function savePerms(perms: Permissions) {
  localStorage.setItem(PERM_KEY, JSON.stringify(perms));
}

// ─── Component ────────────────────────────────────────────────
export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]   = useState(0);
  const [perms, setPerms] = useState<Permissions>(() => (typeof window === 'undefined' ? defaultPerms : loadPerms()));
  const [requesting, setRequesting] = useState<keyof Permissions | null>(null);

  const TOTAL_STEPS = slides.length + 1;  // 3 intro + 1 permissions
  const onPermStep  = step === slides.length;

  function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      savePerms(perms);
      localStorage.setItem('harmony-onboarded-v2', '1');
      onComplete();
    }
  }

  function skipAll() {
    savePerms(perms);
    localStorage.setItem('harmony-onboarded-v2', '1');
    onComplete();
  }

  async function requestPerm(item: PermItem) {
    setRequesting(item.key);
    const granted = await item.request();
    setPerms((p) => ({ ...p, [item.key]: granted || item.automatic === true }));
    setRequesting(null);
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-card">
        {/* Progress dots */}
        <div className="onboard-dots">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`dot ${i === step ? 'dot-active' : ''} ${i < step ? 'dot-done' : ''}`} />
          ))}
        </div>

        {onPermStep ? (
          // ── Permissions step ─────────────────────────────────
          <>
            <div className="onboard-icon"><Shield size={36} /></div>
            <h1>A few quick permissions</h1>
            <p className="onboard-desc">
              You stay in control of every one of these. We only ask once — change them anytime in your browser settings.
            </p>

            <div className="perm-list">
              {permItems.map((item) => {
                const granted = perms[item.key];
                const isAuto  = item.automatic;
                return (
                  <div key={item.key} className={`perm-item ${granted ? 'perm-item-on' : ''}`}>
                    <div className="perm-icon">{item.icon}</div>
                    <div className="perm-text">
                      <p className="perm-label">
                        {item.label}
                        {isAuto && <span className="perm-auto-tag">automatic</span>}
                      </p>
                      <p className="perm-detail">{item.detail}</p>
                    </div>
                    {isAuto ? (
                      <span className="perm-status perm-status-on" title="Always on">
                        <Check size={14} />
                      </span>
                    ) : granted ? (
                      <span className="perm-status perm-status-on" title="Granted">
                        <Check size={14} />
                      </span>
                    ) : (
                      <button
                        onClick={() => requestPerm(item)}
                        disabled={requesting === item.key}
                        className="perm-allow-btn"
                      >
                        {requesting === item.key ? '…' : 'Allow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="perm-foot">
              <XIcon size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Decline any of these and that feature stays off. You can re-enable later in Settings.
            </p>

            <button onClick={next} className="onboard-primary">Get started</button>
            <button onClick={skipAll} className="onboard-skip">Skip — I&apos;ll set this up later</button>
          </>
        ) : (
          // ── Intro slide ────────────────────────────────────
          <>
            <div className="onboard-icon">{slides[step].icon}</div>
            <h1>{slides[step].title}</h1>
            <p className="onboard-desc">{slides[step].desc}</p>
            <button onClick={next} className="onboard-primary">Continue</button>
            <button onClick={skipAll} className="onboard-skip">Skip intro</button>
          </>
        )}
      </div>

      <style>{`
        .onboard-wrap {
          position: fixed; inset: 0;
          background: var(--color-bg);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          overflow-y: auto;
        }
        .onboard-card {
          width: 100%; max-width: 480px;
          text-align: center;
          padding: 1.5rem 0;
        }
        .onboard-dots {
          display: flex; justify-content: center; gap: 6px;
          margin-bottom: 2rem;
        }
        .dot {
          width: 8px; height: 8px;
          border-radius: 4px;
          background: var(--color-border-2);
          transition: all 0.3s ease;
        }
        .dot-active {
          width: 24px;
          background: var(--color-primary);
        }
        .dot-done {
          background: color-mix(in srgb, var(--color-primary) 50%, var(--color-border-2));
        }
        .onboard-icon {
          display: flex; align-items: center; justify-content: center;
          width: 70px; height: 70px;
          margin: 0 auto 1.5rem;
          background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
          border-radius: 50%;
          color: var(--color-primary);
        }
        h1 {
          font-family: Georgia, 'Fraunces', serif;
          font-size: 26px;
          font-weight: 500;
          margin: 0 0 0.75rem;
          color: var(--color-text);
        }
        .onboard-desc {
          font-size: 14.5px;
          color: var(--color-muted);
          line-height: 1.7;
          margin: 0 0 1.5rem;
        }
        .onboard-primary {
          width: 100%;
          padding: 12px;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-md);
          color: #fff;
          font-size: 15px; font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          margin-bottom: 0.5rem;
          transition: filter 0.15s;
        }
        .onboard-primary:hover { filter: brightness(1.05); }
        .onboard-skip {
          background: none; border: none;
          color: var(--color-subtle);
          font-size: 13px;
          cursor: pointer;
          padding: 8px;
          font-family: inherit;
        }
        .onboard-skip:hover { color: var(--color-muted); }

        /* Permissions list */
        .perm-list {
          display: flex; flex-direction: column; gap: 8px;
          margin-bottom: 1rem;
          text-align: left;
        }
        .perm-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          transition: all 0.15s;
        }
        .perm-item-on {
          background: color-mix(in srgb, #34d399 6%, var(--color-surface));
          border-color: color-mix(in srgb, #34d399 30%, var(--color-border));
        }
        .perm-icon {
          width: 32px; height: 32px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-bg);
          border-radius: 50%;
          color: var(--color-primary);
        }
        .perm-item-on .perm-icon { color: #34d399; }
        .perm-text { flex: 1; min-width: 0; }
        .perm-label {
          font-size: 14px; font-weight: 600;
          margin: 0;
          display: flex; align-items: center; gap: 6px;
        }
        .perm-auto-tag {
          font-size: 9.5px; font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: color-mix(in srgb, var(--color-primary) 14%, transparent);
          color: var(--color-primary);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .perm-detail {
          font-size: 12px;
          color: var(--color-muted);
          margin: 2px 0 0;
          line-height: 1.5;
        }
        .perm-allow-btn {
          padding: 6px 12px;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-sm);
          color: #fff;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          flex-shrink: 0;
          transition: filter 0.15s;
        }
        .perm-allow-btn:disabled { opacity: 0.5; cursor: progress; }
        .perm-allow-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .perm-status {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .perm-status-on {
          background: rgba(52,211,153,0.18);
          color: #34d399;
        }
        .perm-foot {
          font-size: 11.5px;
          color: var(--color-subtle);
          line-height: 1.55;
          margin: 0 0 1.5rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
