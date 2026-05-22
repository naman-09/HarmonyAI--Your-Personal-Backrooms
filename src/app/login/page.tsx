'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'rgba(107,143,255,0.15)',
            border: '1px solid rgba(107,143,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: 24,
          }}>◎</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}>
            Harmony
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
            A compassionate space for you
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)', fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)', fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '11px',
              background: loading ? 'rgba(107,143,255,0.4)' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-muted)', marginTop: '1.5rem' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-subtle)', marginTop: '2rem', lineHeight: 1.6 }}>
          Harmony is not a substitute for professional mental health care.
          If you&apos;re in crisis, call iCall: 9152987821.
        </p>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-subtle)', marginTop: '1rem' }}>
          <Link href="/privacy" style={{ color: 'var(--color-subtle)', textDecoration: 'underline' }}>Privacy</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'var(--color-subtle)', textDecoration: 'underline' }}>Terms</Link>
        </p>
      </div>
    </main>
  );
}
