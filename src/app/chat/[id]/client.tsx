'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EmotionMeter } from '@/components/emotion-meter';
import { MultimodalControls } from '@/components/multimodal-controls';
import { useChatStream } from '@/components/chat-stream';
import CrisisScreen from '@/components/crisis-screen';
import { SOSButton } from '@/components/sos-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { scoreEmotion, type EmotionScore, type EmotionSignals } from '@/lib/emotion';

interface Message {
  role:    'user' | 'assistant' | 'crisis' | 'alert';
  content: string;
  ts?:     number;
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

function extractDisplayText(content: string): string {
  try {
    const parsed = JSON.parse(content);
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
      if (text) return text;
    }
  } catch {
    // Not JSON
  }
  return content;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const assistantBuf = useRef('');
  const historyRef   = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        fetch('/api/location', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ lat: coords.latitude, lng: coords.longitude, sessionId }),
        }).catch(() => {});
      },
      () => {}
    );
  }, [sessionId]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        const msgs: Message[] = (d.messages ?? []).map((m: { role: string; content: string; createdAt?: string }) => ({
          role:    m.role as 'user' | 'assistant',
          content: m.content,
          ts:      m.createdAt ? new Date(m.createdAt).getTime() : undefined,
        }));
        setMessages(msgs);
        historyRef.current = msgs
          .filter((m) => m.role !== 'crisis' && m.role !== 'alert')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      })
      .finally(() => setLoadingHist(false));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSignals = useCallback((partial: Partial<EmotionSignals>) => {
    setSignals((prev) => {
      const updated = { ...prev, ...partial };
      setEmotionScore(scoreEmotion(updated));
      return updated;
    });
  }, []);

  const onChunk = useCallback((chunk: any) => {
    if (chunk.type === 'delta') {
      assistantBuf.current += chunk.text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts) {
          return [...prev.slice(0, -1), { role: 'assistant', content: assistantBuf.current }];
        }
        return [...prev, { role: 'assistant', content: assistantBuf.current }];
      });
    }

    if (chunk.type === 'replace') {
      assistantBuf.current = chunk.text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts) {
          return [...prev.slice(0, -1), { role: 'assistant', content: assistantBuf.current }];
        }
        return [...prev, { role: 'assistant', content: assistantBuf.current }];
      });
    }

    if (chunk.type === 'alert' && chunk.level === 2) {
      setMessages((prev) => [
        ...prev,
        {
          role:    'alert',
          content: "Harmony has quietly let someone who cares about you know that you're going through something difficult right now.",
          ts:      Date.now(),
        },
      ]);
    }

    if (chunk.type === 'crisis') {
      setCrisisLevel(chunk.level as 3 | 4);
      setMessages((prev) => [...prev, { role: 'crisis', content: chunk.response, ts: Date.now() }]);
    }

    if (chunk.type === 'done') {
      const content = assistantBuf.current;
      if (content) {
        historyRef.current = [...historyRef.current, { role: 'assistant', content }];
      }
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts) {
          return [...prev.slice(0, -1), { ...last, ts: Date.now() }];
        }
        return prev;
      });
      assistantBuf.current = '';
    }

    if (chunk.type === 'error') {
      const msg = chunk.message?.toLowerCase().includes('econnrefused') || chunk.message?.toLowerCase().includes('fetch failed')
        ? 'Harmony\'s AI is offline. Please make sure Ollama is running (ollama serve) and try again.'
        : `Something went wrong: ${chunk.message}`;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg, ts: Date.now() },
      ]);
    }
  }, []) as any;

  const { send, streaming } = useChatStream({ sessionId, onChunk });

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    if (text.length > 2000) return;

    setInput('');
    assistantBuf.current = '';

    const textSentiment  = estimateTextSentiment(text);
    const currentSignals = { ...signals, textSentiment };
    handleSignals({ textSentiment });

    setMessages((prev) => [...prev, { role: 'user', content: text, ts: Date.now() }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];

    await send(text, currentSignals, historyRef.current.slice(-6));
    inputRef.current?.focus();
  }

  async function endSession() {
    await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' });
    router.push('/dashboard');
  }

  const charCount = input.length;

  return (
    <>
      {crisisLevel && (
        <CrisisScreen
          level={crisisLevel}
          trustedName={trustedContactName}
          onSafe={() => setCrisisLevel(null)}
        />
      )}

      <div className="chat-container">
        {/* Top bar */}
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <EmotionMeter score={emotionScore} size={48} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Harmony</p>
              <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {streaming ? (
                  <span className="typing-indicator">
                    <span>Thinking</span>
                    <span className="dots"><span>.</span><span>.</span><span>.</span></span>
                  </span>
                ) : 'Here with you'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle size={16} />
            <button onClick={endSession} className="end-session-btn" aria-label="End session">
              End session
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {loadingHist ? (
            <div className="loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-bubble" style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', width: `${50 + i * 10}%` }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 16 }}>💙</div>
              <p>Share what&apos;s on your mind.</p>
              <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginTop: 6 }}>This is a safe space</p>
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} streaming={streaming && i === messages.length - 1 && m.role === 'assistant'} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Multimodal controls */}
        <div className="multimodal-area">
          <MultimodalControls onSignals={handleSignals} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="What's on your mind…"
                rows={1}
                className="chat-input"
                aria-label="Message input"
                maxLength={2000}
              />
              {charCount > 1800 && (
                <span style={{
                  position: 'absolute', right: 10, bottom: 8,
                  fontSize: 11, color: charCount > 1950 ? 'var(--color-danger)' : 'var(--color-subtle)',
                }}>
                  {charCount}/2000
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="send-btn"
              aria-label="Send message"
            >
              {streaming ? (
                <span className="send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="disclaimer">
            Not a substitute for professional care. Crisis? iCall: 9152987821
          </p>
        </div>
      </div>

      <SOSButton />

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          max-width: 720px;
          margin: 0 auto;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          backdrop-filter: blur(8px);
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .end-session-btn {
          font-size: 12px;
          color: var(--color-muted);
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          padding: 6px 12px;
          transition: all 0.15s;
        }
        .end-session-btn:hover {
          border-color: var(--color-border-2);
          color: var(--color-text);
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }

        .multimodal-area {
          padding: 0 1rem 0.5rem;
          flex-shrink: 0;
        }

        .input-area {
          padding: 0.5rem 1rem 1rem;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
          background: var(--color-bg);
        }

        .chat-input {
          width: 100%;
          resize: none;
          padding: 10px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border-2);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 14px;
          line-height: 1.5;
          outline: none;
          font-family: inherit;
          min-height: 42px;
          max-height: 120px;
          field-sizing: content;
        }
        .chat-input:focus {
          border-color: var(--color-primary);
        }

        .send-btn {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-md);
          color: #fff;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .send-btn:disabled {
          background: rgba(107,143,255,0.2);
          cursor: not-allowed;
        }

        .send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .disclaimer {
          font-size: 11px;
          color: var(--color-subtle);
          margin-top: 6px;
          text-align: center;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: var(--color-muted);
          font-size: 15px;
          text-align: center;
          padding: 2rem;
        }

        .loading-skeleton {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 1rem 0;
        }
        .skeleton-bubble {
          height: 48px;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .typing-indicator .dots span {
          animation: blink 1.4s infinite both;
        }
        .typing-indicator .dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator .dots span:nth-child(3) { animation-delay: 0.4s; }

        /* Message bubbles */
        .bubble-user {
          max-width: 80%;
          padding: 10px 14px;
          background: rgba(107,143,255,0.15);
          border: 1px solid rgba(107,143,255,0.25);
          border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
          font-size: 14px;
          line-height: 1.7;
        }

        .bubble-assistant {
          max-width: 85%;
          padding: 10px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
          font-size: 14px;
          line-height: 1.7;
        }

        .bubble-assistant p { margin: 0 0 0.5em; }
        .bubble-assistant p:last-child { margin-bottom: 0; }
        .bubble-assistant strong { font-weight: 600; }
        .bubble-assistant em { font-style: italic; }
        .bubble-assistant ul, .bubble-assistant ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }

        .msg-time {
          font-size: 11px;
          color: var(--color-subtle);
          margin-top: 4px;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .chat-container { max-width: 100%; }
          .messages-area { padding: 0.75rem; }
          .input-area { padding: 0.5rem 0.75rem 0.75rem; }
          .multimodal-area { padding: 0 0.75rem 0.5rem; }
          .chat-header { padding: 0.5rem 0.75rem; }
          .bubble-user, .bubble-assistant { max-width: 90%; }
        }
      `}</style>
    </>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser   = message.role === 'user';
  const isCrisis = message.role === 'crisis';
  const isAlert  = message.role === 'alert';

  if (isCrisis) {
    return (
      <div style={{
        padding: '1rem 1.25rem',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 14, lineHeight: 1.7,
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
        💙 {message.content}
      </div>
    );
  }

  const displayContent = isUser ? message.content : extractDisplayText(message.content);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div className={isUser ? 'bubble-user' : 'bubble-assistant'}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
        )}
      </div>
      {message.ts && !streaming && (
        <span className="msg-time">{relativeTime(message.ts)}</span>
      )}
    </div>
  );
}
