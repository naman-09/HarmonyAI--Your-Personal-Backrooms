'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemedBackground } from '@/components/themed-background';
import { ClientStyle } from '@/components/client-style';

/** 8-rayed brand mark — mirrors harmony-mark.svg */
function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="reg-brand-mark"
    >
      <g fill="var(--color-primary)">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="11" y="2" width="2" height="6" rx="1"
            transform={`rotate(${i * 45} 12 12)`}
            opacity={0.5 + (i % 3) * 0.18}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="3" fill="var(--color-primary)" />
    </svg>
  );
}

/** Three-bar password strength meter */
function PasswordStrength({ password }: { password: string }) {
  const hasLength  = password.length >= 8;
  const hasNumber  = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score      = [hasLength, hasNumber, hasSpecial].filter(Boolean).length;
  const colors     = ['var(--color-danger)', '#e0a030', 'var(--color-primary)'];
  const labels     = ['Weak', 'Fair', 'Strong'];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i < score ? colors[score - 1] : 'rgba(161,206,63,0.12)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, margin: 0, color: score > 0 ? colors[score - 1] : '#8a7a5a' }}>
        {score === 0 ? 'Min 8 chars, 1 number, 1 special character' : labels[score - 1]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return; }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ThemedBackground />

      <main className="reg-shell">
        {/* ── Dark NEBULA island ── */}
        <div className="reg-island">

          {/* Brand */}
          <div className="reg-brand">
            <div className="reg-brand-halo">
              <BrandMark size={32} />
            </div>
            <h1 className="reg-wordmark">Harmony</h1>
            <p className="reg-tagline">Your private mental wellness companion</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="reg-form">
            <div className="reg-field">
              <label className="reg-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="reg-input"
                placeholder="How should we call you?"
              />
            </div>

            <div className="reg-field">
              <label className="reg-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="reg-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="reg-field">
              <label className="reg-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="reg-input"
                placeholder="••••••••"
              />
              {password && <PasswordStrength password={password} />}
            </div>

            {error && (
              <p className="reg-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="reg-submit"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="reg-swap">
            Already have an account?{' '}
            <Link href="/login" className="reg-link">Sign in</Link>
          </p>

          <p className="reg-disclaimer">
            Harmony is not a substitute for professional mental health care.<br />
            If you&apos;re in crisis, call iCall:{' '}
            <a href="tel:9152987821" className="reg-link">9152987821</a>.
          </p>

          <p className="reg-legal">
            <Link href="/privacy" className="reg-legal-link">Privacy</Link>
            {' · '}
            <Link href="/terms" className="reg-legal-link">Terms</Link>
          </p>
        </div>
      </main>

      <ClientStyle>{`
        /* ── Register shell — full viewport, centres the island ── */
        .reg-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
        }

        /* ── The dark NEBULA island ── */
        .reg-island {
          width: 100%;
          max-width: 460px;
          background: #013a2a;
          border-radius: var(--radius-xl);
          padding: 40px 36px 32px;
          border: 1px solid rgba(161, 206, 63, 0.14);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.14);
          position: relative;
          z-index: 1;
        }

        /* ── Brand section ── */
        .reg-brand {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .reg-brand-halo {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: rgba(161, 206, 63, 0.12);
          border: 1px solid rgba(161, 206, 63, 0.30);
          box-shadow: 0 0 24px rgba(161, 206, 63, 0.18);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .reg-brand-mark {
          animation: regBrandSpin 24s linear infinite;
        }
        @keyframes regBrandSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .reg-brand-mark { animation: none; } }

        .reg-wordmark {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 500;
          color: #f5ead0;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .reg-tagline {
          font-size: 14px;
          color: #e0d2a8;
          margin: 0;
        }

        /* ── Form fields ── */
        .reg-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .reg-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .reg-label {
          font-size: 13px;
          color: #e0d2a8;
          font-weight: 500;
        }
        .reg-input {
          width: 100%;
          padding: 10px 14px;
          background: #025038;
          border: 1px solid rgba(161, 206, 63, 0.18);
          border-radius: var(--radius-md);
          color: #f5ead0;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .reg-input::placeholder { color: rgba(245, 234, 208, 0.35); }
        .reg-input:focus { border-color: var(--color-primary); }

        /* ── Error ── */
        .reg-error {
          font-size: 13px;
          color: var(--color-danger);
          text-align: center;
          margin: 0;
        }

        /* ── Submit button ── */
        .reg-submit {
          margin-top: 4px;
          width: 100%;
          padding: 11px;
          background: var(--color-primary);
          color: #011a10;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
        }
        .reg-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .reg-submit:not(:disabled):hover {
          background: var(--accent-hover);
        }

        /* ── Bottom links ── */
        .reg-swap {
          text-align: center;
          font-size: 14px;
          color: #b8a878;
          margin-top: 1.5rem;
        }
        .reg-link {
          color: var(--color-primary);
          text-decoration: none;
        }
        .reg-link:hover { text-decoration: underline; }

        .reg-disclaimer {
          text-align: center;
          font-size: 12px;
          color: #8a7a5a;
          margin-top: 2rem;
          line-height: 1.6;
        }
        .reg-legal {
          text-align: center;
          font-size: 11px;
          color: #8a7a5a;
          margin-top: 1rem;
        }
        .reg-legal-link {
          color: #8a7a5a;
          text-decoration: underline;
        }
        .reg-legal-link:hover { color: #b8a878; }
      `}</ClientStyle>
    </>
  );
}
