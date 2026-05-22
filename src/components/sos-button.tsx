'use client';

import { useState } from 'react';

const HELPLINES = [
  { name: 'iCall (TISS)',          number: '9152987821',   note: 'Mon-Sat 8am-10pm' },
  { name: 'Vandrevala Foundation', number: '18602662345',  note: '24/7, multilingual' },
  { name: 'AASRA',                number: '9820466627',   note: '24/7' },
  { name: 'Emergency',            number: '112',           note: '24/7' },
];

export function SOSButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Emergency helplines"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(248,113,113,0.15)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          letterSpacing: '0.04em',
        }}
      >
        SOS
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              marginBottom: 'env(safe-area-inset-bottom, 0)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Crisis helplines
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              You&apos;re not alone. Tap to call directly.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HELPLINES.map(({ name, number, note }) => (
                <a
                  key={number}
                  href={`tel:${number}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: 'var(--color-text)',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{note}</p>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600 }}>
                    {number}
                  </span>
                </a>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '10px',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-muted)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
