import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Harmony' };

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <Link href="/" style={{ fontSize: 13, color: 'var(--color-muted)', textDecoration: 'none' }}>← Back</Link>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '1.5rem 0 1rem' }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: '2rem' }}>Last updated: May 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>What we collect</h2>
        <p style={{ color: 'var(--color-muted)' }}>We collect only what&apos;s necessary: your email, name, and conversation data to provide the service. Voice and camera data is processed locally on your device and never stored on our servers.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>How we use your data</h2>
        <p style={{ color: 'var(--color-muted)' }}>Your data powers your conversations with Harmony. Emotion signals help us provide better support. Crisis data is logged securely for safety purposes.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Trusted contacts</h2>
        <p style={{ color: 'var(--color-muted)' }}>If you add a trusted contact, they may receive SMS alerts during detected crises. No conversation content is shared — only that you may need support.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Data security</h2>
        <p style={{ color: 'var(--color-muted)' }}>Passwords are hashed with bcrypt. Authentication uses httpOnly JWT cookies. API keys are server-side only. The audit log is append-only.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Your rights</h2>
        <p style={{ color: 'var(--color-muted)' }}>You can export your data from Settings. Contact us to request data deletion.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Contact</h2>
        <p style={{ color: 'var(--color-muted)' }}>Questions? Reach us at naman@harmony.com.</p>
      </div>
    </main>
  );
}
