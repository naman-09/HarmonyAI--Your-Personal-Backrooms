'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmotionMeter } from '@/components/emotion-meter';
import { MultimodalControls } from '@/components/multimodal-controls';
import { useChatStream } from '@/components/chat-stream';
import CrisisScreen from '@/components/crisis-screen';
import { scoreEmotion, type EmotionScore, type EmotionSignals } from '@/lib/emotion';

interface Message {
  role:    'user' | 'assistant' | 'crisis' | 'alert';
  content: string;
}

const DEFAULT_SIGNALS: EmotionSignals = {
  voicePitch:    0,
  voiceVolume:   0,
  faceAnger:     0,
  textSentiment: 0.5,
  faceAvailable: false,
};

const DEFAULT_SCORE: EmotionScore = {
  rage:         0,
  calm:         1,
  label:        'calm',
  displayValue: 1,
};

function estimateTextSentiment(text: string): number {
  const distressWords = [
    'angry','furious','hate','anxious','scared','terrible',
    'awful','hopeless','worthless','depressed','miserable',
    'frustrated','overwhelmed','stressed','exhausted',
  ];
  const words   = text.toLowerCase().split(/\W+/);
  const matches = words.filter((w) => distressWords.includes(w)).length;
  return Math.min(matches / 3, 1);
}

export default function ChatClient({
  sessionId,
  userId,
  trustedContactName,
}: {
  sessionId:          string;
  userId:             number;
  trustedContactName?: string;
}) {
  const router = useRouter();

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState('');
  const [emotionScore,  setEmotionScore]  = useState<EmotionScore>(DEFAULT_SCORE);
  const [signals,       setSignals]       = useState<EmotionSignals>(DEFAULT_SIGNALS);
  const [loadingHist,   setLoadingHist]   = useState(true);
  const [crisisLevel,   setCrisisLevel]   = useState<3 | 4 | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const assistantBuf = useRef('');
  const historyRef   = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // ── Request location on mount, post to API ────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        fetch('/api/location', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ lat: coords.latitude, lng: coords.longitude, sessionId }),
        }).catch(() => { /* non-critical */ });
      },
      () => { /* user declined — silently do nothing */ }
    );
  }, [sessionId]);

  // ── Load history ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        const msgs: Message[] = (d.messages ?? []).map((m: { role: string; content: string }) => ({
          role:    m.role as 'user' | 'assistant',
          content: m.content,
        }));
        setMessages(msgs);
        historyRef.current = msgs
          .filter((m) => m.role !== 'crisis' && m.role !== 'alert')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      })
      .finally(() => setLoadingHist(false));
  }, [sessionId]);

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Multimodal signals ────────────────────────────────────────
  const handleSignals = useCallback((partial: Partial<EmotionSignals>) => {
    setSignals((prev) => {
      const updated = { ...prev, ...partial };
      setEmotionScore(scoreEmotion(updated));
      return updated;
    });
  }, []);

  // ── Streaming ─────────────────────────────────────────────────
  const onChunk = useCallback((chunk: any) => {
    if (chunk.type === 'delta') {
      assistantBuf.current += chunk.text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content: assistantBuf.current }];
        }
        return [...prev, { role: 'assistant', content: assistantBuf.current }];
      });
    }

    if (chunk.type === 'replace') {
      assistantBuf.current = chunk.text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content: assistantBuf.current }];
        }
        return [...prev, { role: 'assistant', content: assistantBuf.current }];
      });
    }

    // Level 2 distress — gentle in-chat notice
    if (chunk.type === 'alert' && chunk.level === 2) {
      setMessages((prev) => [
        ...prev,
        {
          role:    'alert',
          content: "💙 Harmony has quietly let someone who cares about you know that you're going through something difficult right now.",
        },
      ]);
    }

    // Level 3 / 4 — full-screen crisis overlay
    if (chunk.type === 'crisis') {
      setCrisisLevel(chunk.level as 3 | 4);
      setMessages((prev) => [...prev, { role: 'crisis', content: chunk.response }]);
    }

    if (chunk.type === 'done') {
      const content = assistantBuf.current;
      if (content) {
        historyRef.current = [...historyRef.current, { role: 'assistant', content }];
      }
      assistantBuf.current = '';
    }

    if (chunk.type === 'error') {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${chunk.message}` },
      ]);
    }
  }, []) as any;

  const { send, streaming } = useChatStream({ sessionId, onChunk });

  // ── Submit ────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    assistantBuf.current = '';

    const textSentiment  = estimateTextSentiment(text);
    const currentSignals = { ...signals, textSentiment };
    handleSignals({ textSentiment });

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];

    await send(text, currentSignals, historyRef.current.slice(-6));
  }

  async function endSession() {
    await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' });
    router.push('/dashboard');
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Crisis full-screen overlay */}
      {crisisLevel && (
        <CrisisScreen
          level={crisisLevel}
          trustedName={trustedContactName}
          onSafe={() => setCrisisLevel(null)}
        />
      )}

      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', maxWidth: 680, margin: '0 auto',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <EmotionMeter score={emotionScore} size={56} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Harmony</p>
              <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {streaming ? 'Here with you…' : 'Here with you'}
              </p>
            </div>
          </div>
          <button
            onClick={endSession}
            style={{
              fontSize: 12, color: 'var(--color-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
            }}
          >
            End session
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {loadingHist ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Loading…</p>
          ) : messages.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 14, textAlign: 'center', marginTop: '3rem' }}>
              Share what&apos;s on your mind. This is a safe space.
            </p>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Multimodal controls */}
        <div style={{ padding: '0 1.25rem 0.75rem', flexShrink: 0 }}>
          <MultimodalControls onSignals={handleSignals} />
        </div>

        {/* Input */}
        <div style={{
          padding: '0.75rem 1.25rem 1.25rem',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="What's on your mind…"
              rows={2}
              style={{
                flex: 1, resize: 'none',
                padding: '10px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              style={{
                padding: '0 18px',
                background: streaming || !input.trim()
                  ? 'rgba(107,143,255,0.2)'
                  : 'var(--color-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#fff', fontSize: 14, fontWeight: 500,
                cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              {streaming ? '…' : '→'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-subtle)', marginTop: 8 }}>
            Not a substitute for professional care. Crisis? iCall: 9152987821
          </p>
        </div>
      </div>
    </>
  );
}

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser   = message.role === 'user';
  const isCrisis = message.role === 'crisis';
  const isAlert  = message.role === 'alert';

  let displayContent = message.content;
  if (!isUser && !isCrisis && !isAlert) {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && typeof parsed === 'object') {
        let text = typeof parsed.response_text === 'string' ? parsed.response_text.trim() : '';
        if (!text) {
          if (typeof parsed.validation === 'string' && parsed.validation.trim()) {
            text = parsed.validation.trim();
          }
          if (typeof parsed.question === 'string' && parsed.question.trim()) {
            text += (text ? '\n\n' : '') + parsed.question.trim();
          }
        }
        if (text) displayContent = text;
      }
    } catch {
      // Not JSON (streaming or plain text) — use as-is
    }
  }

  if (isCrisis) {
    return (
      <div style={{
        padding: '1rem 1.25rem',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 14, lineHeight: 1.7,
        color: 'var(--color-text)',
        whiteSpace: 'pre-line',
      }}>
        {message.content}
      </div>
    );
  }

  if (isAlert) {
    return (
      <div style={{
        padding: '10px 16px',
        background: 'rgba(107,143,255,0.07)',
        border: '1px solid rgba(107,143,255,0.18)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13, lineHeight: 1.6,
        color: 'var(--color-muted)',
        textAlign: 'center',
      }}>
        {message.content}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        background: isUser ? 'rgba(107,143,255,0.15)' : 'var(--color-surface)',
        border: `1px solid ${isUser ? 'rgba(107,143,255,0.25)' : 'var(--color-border)'}`,
        borderRadius: isUser
          ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
          : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
        fontSize: 14, lineHeight: 1.7,
        color: 'var(--color-text)',
        whiteSpace: 'pre-wrap',
      }}>
        {displayContent}
      </div>
    </div>
  );
}
