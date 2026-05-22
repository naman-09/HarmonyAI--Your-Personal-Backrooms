import Link from 'next/link';

export const metadata = { title: 'Terms of Service — Harmony' };

export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <Link href="/" style={{ fontSize: 13, color: 'var(--color-muted)', textDecoration: 'none' }}>← Back</Link>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '1.5rem 0 1rem' }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: '2rem' }}>Last updated: May 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Important disclaimer</h2>
        <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>Harmony is NOT a substitute for professional mental health care. If you are in immediate danger, call 112 or go to your nearest emergency room.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>What Harmony is</h2>
        <p style={{ color: 'var(--color-muted)' }}>Harmony is an AI-powered wellness companion designed to provide emotional support and coping techniques. It is not a licensed therapist, counsellor, or medical professional.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Acceptable use</h2>
        <p style={{ color: 'var(--color-muted)' }}>You agree to use Harmony respectfully. Do not attempt to manipulate the crisis detection system. Do not share your account credentials.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Crisis alerts</h2>
        <p style={{ color: 'var(--color-muted)' }}>By adding a trusted contact, you consent to automatic SMS alerts during detected crisis situations. You can remove your trusted contact at any time in Settings.</p>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Limitation of liability</h2>
        <p style={{ color: 'var(--color-muted)' }}>Harmony is provided as-is. We make no guarantees about the accuracy of AI responses or crisis detection. Always seek professional help for serious mental health concerns.</p>
      </div>
    </main>
  );
}
