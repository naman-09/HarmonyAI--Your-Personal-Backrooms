'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: 420,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: '1.5rem' }}>💙</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Harmony ran into an unexpected issue. Please refresh the page.
            If you&apos;re in crisis, call iCall: 9152987821.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}
