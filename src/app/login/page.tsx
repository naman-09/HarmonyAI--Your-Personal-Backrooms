'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemedBackground } from '@/components/themed-background';
import { ClientStyle } from '@/components/client-style';

/** 8-rayed brand mark — spins on mount, matches harmony-mark.svg */
function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="login-brand-mark"
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

export default function LoginPage() {
  const router  = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Login failed'); return; }
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

      <main className="login-shell">
        {/* ── Dark NEBULA island ── */}
        <div className="login-island">

          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-halo">
              <BrandMark size={32} />
            </div>
            <h1 className="login-wordmark">Harmony</h1>
            <p className="login-tagline">A compassionate space for you</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="login-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="login-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="login-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="login-swap">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="login-link">Sign up</Link>
          </p>

          <p className="login-disclaimer">
            Harmony is not a substitute for professional mental health care.<br />
            If you&apos;re in crisis, call iCall:{' '}
            <a href="tel:9152987821" className="login-link">9152987821</a>.
          </p>

          <p className="login-legal">
            <Link href="/privacy" className="login-legal-link">Privacy</Link>
            {' · '}
            <Link href="/terms" className="login-legal-link">Terms</Link>
          </p>
        </div>
      </main>

      <ClientStyle>{`
        /* ── Login shell — full viewport, centres the island ── */
        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
        }

        /* ── The dark NEBULA island ── */
        .login-island {
          width: 100%;
          max-width: 460px;
          background: #013a2a;
          border-radius: var(--radius-xl);          /* 24px */
          padding: 40px 36px 32px;
          border: 1px solid rgba(161, 206, 63, 0.14);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.14);
          position: relative;
          z-index: 1;
        }

        /* ── Brand section ── */
        .login-brand {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .login-brand-halo {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: rgba(161, 206, 63, 0.12);
          border: 1px solid rgba(161, 206, 63, 0.30);
          box-shadow: 0 0 24px rgba(161, 206, 63, 0.18);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .login-brand-mark {
          animation: loginBrandSpin 24s linear infinite;
        }
        @keyframes loginBrandSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .login-brand-mark { animation: none; } }

        .login-wordmark {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 500;
          color: #f5ead0;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .login-tagline {
          font-size: 14px;
          color: #e0d2a8;
          margin: 0;
        }

        /* ── Form fields ── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-label {
          font-size: 13px;
          color: #e0d2a8;
          font-weight: 500;
        }
        .login-input {
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
        }
        .login-input::placeholder { color: rgba(245, 234, 208, 0.35); }
        .login-input:focus { border-color: var(--color-primary); }

        /* ── Error ── */
        .login-error {
          font-size: 13px;
          color: var(--color-danger);
          text-align: center;
          margin: 0;
        }

        /* ── Submit button ── */
        .login-submit {
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
        .login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-submit:not(:disabled):hover {
          background: var(--accent-hover);
        }

        /* ── Bottom links ── */
        .login-swap {
          text-align: center;
          font-size: 14px;
          color: #b8a878;
          margin-top: 1.5rem;
        }
        .login-link {
          color: var(--color-primary);
          text-decoration: none;
        }
        .login-link:hover { text-decoration: underline; }

        .login-disclaimer {
          text-align: center;
          font-size: 12px;
          color: #8a7a5a;
          margin-top: 2rem;
          line-height: 1.6;
        }
        .login-legal {
          text-align: center;
          font-size: 11px;
          color: #8a7a5a;
          margin-top: 1rem;
        }
        .login-legal-link {
          color: #8a7a5a;
          text-decoration: underline;
        }
        .login-legal-link:hover { color: #b8a878; }
      `}</ClientStyle>
    </>
  );
}
