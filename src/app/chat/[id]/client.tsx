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
import EMOTION_LEXICON from '@/lib/emotion-lexicon.json';

interface Message {
  role:    'user' | 'assistant' | 'crisis' | 'alert';
  content: string;
  ts?:     number;
}

const DEFAULT_SIGNALS: EmotionSignals = {
  voicePitch: 0, voiceVolume: 0,
  faceAnger: 0, faceSad: 0, faceHappy: 0, faceSurprised: 0,
  faceDisgusted: 0, faceFearful: 0, faceNeutral: 1,
  eyeOpenness: 0, browRaise: 0, mouthOpen: 0,
  textSentiment: 0.5, faceAvailable: false,
};
const DEFAULT_SCORE: EmotionScore = { rage: 0, calm: 1, label: 'calm', displayValue: 1 };

// ── Lexicon-powered text emotion scorer ───────────────────────
// Uses GoEmotions-derived lexicon when populated; falls back to
// keyword list so scoring is always non-zero even before lexicon build.
const FALLBACK_DISTRESS = new Set([
  'angry','furious','hate','anxious','scared','terrible','awful','hopeless',
  'worthless','depressed','miserable','frustrated','overwhelmed','stressed',
  'exhausted','panic','alone','empty','broken','numb','crying','tired',
  'desperate','afraid','nervous','guilty','shame','embarrassed','helpless',
  'suicidal','cutting','hurt','pain','crying','grief','loss','dead',
]);
const FALLBACK_JOY = new Set([
  'happy','excited','grateful','joy','love','great','good','wonderful',
  'thankful','hopeful','proud','calm','peaceful','amazing','better',
]);

type LexEntry = { distress: number; joy: number; anger: number; sadness: number; fear: number };
const lexicon = EMOTION_LEXICON as Record<string, LexEntry>;
const LEXICON_SIZE = Object.keys(lexicon).length;

function estimateTextSentiment(text: string): number {
  const words  = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  if (words.length === 0) return 0.2;

  if (LEXICON_SIZE > 0) {
    // ── Lexicon path: weighted average of word distress scores ──
    let totalWeight = 0;
    let distressSum = 0;
    let joySum      = 0;
    for (const w of words) {
      const entry = lexicon[w];
      if (!entry) continue;
      const weight  = Math.max(entry.distress, entry.joy) + 0.05; // bias toward signal words
      distressSum  += entry.distress * weight;
      joySum       += entry.joy      * weight;
      totalWeight  += weight;
    }
    if (totalWeight === 0) return 0.2;  // no signal words found → neutral baseline
    const distressProb = distressSum / totalWeight;
    const joyProb      = joySum      / totalWeight;
    // Final score: distress raised, joy lowers it
    return Math.min(Math.max(distressProb * 1.4 - joyProb * 0.5, 0), 1);
  }

  // ── Fallback path (before lexicon is built) ──────────────────
  let d = 0; let j = 0;
  for (const w of words) {
    if (FALLBACK_DISTRESS.has(w)) d++;
    if (FALLBACK_JOY.has(w)) j++;
  }
  return Math.min(Math.max((d / Math.max(words.length * 0.15, 1)) - (j * 0.1), 0), 1);
}

function tryParseHarmonyJSON(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { /* */ }
  const stripped = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  if (stripped !== raw) {
    try { return JSON.parse(stripped) as Record<string, unknown>; } catch { /* */ }
  }
  const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>; } catch { /* */ }
  }
  return null;
}

function extractDisplayText(content: string): string {
  const parsed = tryParseHarmonyJSON(content);
  if (parsed) {
    let text = typeof parsed.response_text === 'string' ? (parsed.response_text as string).trim() : '';
    if (!text) {
      if (typeof parsed.validation === 'string' && (parsed.validation as string).trim())
        text = (parsed.validation as string).trim();
      if (typeof parsed.question === 'string' && (parsed.question as string).trim())
        text += (text ? '\n\n' : '') + (parsed.question as string).trim();
    }
    if (text) return text;
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

// ─── Side panel sub-components ───────────────────────────────

/** Animated bars showing mic volume in real time */
function VoiceBars({ volume, active }: { volume: number; active: boolean }) {
  const factors = [0.5, 0.8, 0.55, 1.0, 0.7, 0.9, 0.45, 0.75, 0.6];
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 44 }}>
      {factors.map((f, i) => {
        const h = active ? Math.max(4, f * (Math.min(volume, 100) / 100) * 38 + 4) : 4;
        return (
          <div key={i} style={{
            width: 4, borderRadius: 2,
            height: `${h}px`,
            background: 'var(--color-primary)',
            opacity: active ? 0.55 + f * 0.45 : 0.18,
            transition: 'height 0.1s ease-out, opacity 0.15s',
          }} />
        );
      })}
    </div>
  );
}

/** Harmony's animated waveform — pulses when AI is generating a response */
function HarmonyWave({ active }: { active: boolean }) {
  const heights = [0.55, 1.0, 0.7, 0.85, 0.6, 0.9, 0.5];
  return (
    <>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 44 }}>
        {heights.map((h, i) => (
          <div key={i} style={{
            width: 4, borderRadius: 2,
            height: active ? `${h * 36}px` : '4px',
            background: 'rgba(200,145,90,0.85)',
            opacity: active ? 0.7 + h * 0.3 : 0.2,
            transition: 'height 0.3s ease, opacity 0.3s',
            animation: active ? `harmonyBar 1.3s ease-in-out ${i * 0.12}s infinite alternate` : 'none',
          }} />
        ))}
      </div>
      <style>{`
        @keyframes harmonyBar {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1);    }
        }
      `}</style>
    </>
  );
}

// ─── Typing-animation bubble ──────────────────────────────────

interface BubbleProps {
  message:          Message;
  streaming?:       boolean;
  animate?:         boolean;
  onAnimDone?:      () => void;
}

function MessageBubble({ message, streaming, animate, onAnimDone }: BubbleProps) {
  const isUser   = message.role === 'user';
  const isCrisis = message.role === 'crisis';
  const isAlert  = message.role === 'alert';

  const fullText = isUser ? message.content : extractDisplayText(message.content);

  // Typewriter state — starts empty when animate=true, full text otherwise
  const [typed,    setTyped]    = useState(() => animate ? '' : fullText);
  const [isDone,   setIsDone]   = useState(!animate);
  const doneRef = useRef(onAnimDone);
  useEffect(() => { doneRef.current = onAnimDone; }, [onAnimDone]);

  useEffect(() => {
    if (!animate || !fullText) {
      setTyped(fullText);
      setIsDone(true);
      return;
    }
    setTyped('');
    setIsDone(false);
    let i = 0;
    // Target ~1.4 s total — batch chars so it's consistent across message lengths
    const totalTicks = 88; // at 16 ms ≈ 1.4 s
    const charsPerTick = Math.max(1, Math.ceil(fullText.length / totalTicks));

    const id = setInterval(() => {
      i = Math.min(i + charsPerTick, fullText.length);
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(id);
        setIsDone(true);
        doneRef.current?.();
      }
    }, 16);
    return () => clearInterval(id);
  }, [animate, fullText]);

  // While waiting for model response (streaming=true, no message yet)
  const isRawJson   = !isUser && fullText === message.content && message.content.trimStart().startsWith('{');
  const showDots    = streaming && (isRawJson || !message.content);
  const displayText = animate ? typed : (showDots ? '' : fullText);

  // ── Render special roles ──────────────────────────────────────
  if (isCrisis) {
    return (
      <div style={{
        padding: '1rem 1.25rem',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line',
      }}>
        {message.content}
      </div>
    );
  }
  if (isAlert) {
    return (
      <div style={{
        padding: '10px 16px',
        background: 'rgba(200,145,90,0.07)',
        border: '1px solid rgba(200,145,90,0.18)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13, lineHeight: 1.6,
        color: 'var(--color-muted)', textAlign: 'center',
      }}>
        💙 {message.content}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div className={isUser ? 'bubble-user' : 'bubble-assistant'}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        ) : showDots ? (
          <span className="typing-dots"><span>●</span><span>●</span><span>●</span></span>
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
            {/* blinking cursor while typing */}
            {animate && !isDone && (
              <span style={{
                display: 'inline-block', width: 2, height: '1em',
                background: 'var(--color-primary)', marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'cursorBlink 0.7s step-end infinite',
              }} />
            )}
          </>
        )}
      </div>
      {message.ts && !(animate && !isDone) && (
        <span className="msg-time">{relativeTime(message.ts)}</span>
      )}
    </div>
  );
}

// ─── Main chat client ─────────────────────────────────────────

export default function ChatClient({
  sessionId, userId, trustedContactName,
}: {
  sessionId: string; userId: number; trustedContactName?: string;
}) {
  const router = useRouter();

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [emotionScore, setEmotionScore] = useState<EmotionScore>(DEFAULT_SCORE);
  const [signals,      setSignals]      = useState<EmotionSignals>(DEFAULT_SIGNALS);
  const [loadingHist,  setLoadingHist]  = useState(true);
  const [crisisLevel,  setCrisisLevel]  = useState<3 | 4 | null>(null);

  // Side-panel state
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn,   setCameraOn]   = useState(false);
  const [micOn,      setMicOn]      = useState(false);
  const [micVolume,  setMicVolume]  = useState(0);

  // Typing animation
  const [animateLastMsg, setAnimateLastMsg] = useState(false);

  // TTS — Harmony speaks responses aloud
  const [ttsEnabled,  setTtsEnabled]  = useState(true);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const lastResponseRef = useRef('');   // stores text to speak after animation

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const assistantBuf = useRef('');
  const historyRef   = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // ── Geolocation ───────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        fetch('/api/location', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude, sessionId }),
        }).catch(() => {});
      },
      () => {}
    );
  }, [sessionId]);

  // ── Load history ──────────────────────────────────────────────
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

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Emotion signals ───────────────────────────────────────────
  const handleSignals = useCallback((partial: Partial<EmotionSignals>) => {
    setSignals((prev) => {
      const updated = { ...prev, ...partial };
      setEmotionScore(scoreEmotion(updated));
      return updated;
    });
  }, []);

  // ── Panel callbacks ───────────────────────────────────────────
  const handleCameraChange = useCallback((on: boolean) => setCameraOn(on), []);
  const handleMicChange    = useCallback((on: boolean) => setMicOn(on), []);
  const handleMicLevel     = useCallback((volume: number) => setMicVolume(volume), []);

  // ── TTS — speak Harmony's responses ──────────────────────────
  const speakText = useCallback((text: string) => {
    if (!ttsEnabled || !text || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    // Cancel any in-progress speech before starting new
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 0.92;   // slightly slower = more natural for empathy
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick the most natural-sounding voice available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      (v.name.toLowerCase().includes('google') ||
       v.name.toLowerCase().includes('natural') ||
       v.name.toLowerCase().includes('samantha') ||
       v.name.toLowerCase().includes('aria') ||
       v.name.toLowerCase().includes('nova')) &&
      v.lang.startsWith('en')
    ) ?? voices.find(v => v.lang.startsWith('en') && !v.name.includes('Male'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setTtsSpeaking(true);
    utterance.onend   = () => setTtsSpeaking(false);
    utterance.onerror = () => setTtsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  // ── onTranscript — speech recognized → auto-send ─────────────
  const [pendingTranscript, setPendingTranscript] = useState<string>('');
  const handleTranscript = useCallback((transcript: string) => {
    if (!transcript.trim()) return;
    setInput(transcript.trim());
    setPendingTranscript(transcript.trim());
  }, []);

  // ── Stream chunk handler ──────────────────────────────────────
  const onChunk = useCallback((chunk: any) => {
    if (chunk.type === 'delta') {
      assistantBuf.current += chunk.text;
      const snapshot = assistantBuf.current;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts)
          return [...prev.slice(0, -1), { role: 'assistant', content: snapshot }];
        return [...prev, { role: 'assistant', content: snapshot }];
      });
    }

    if (chunk.type === 'replace') {
      const text = chunk.text as string;
      assistantBuf.current = text;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts)
          return [...prev.slice(0, -1), { role: 'assistant', content: text }];
        return [...prev, { role: 'assistant', content: text }];
      });
    }

    if (chunk.type === 'alert' && chunk.level === 2) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'alert',
          content: "Harmony has quietly let someone who cares about you know that you're going through something difficult right now.",
          ts: Date.now(),
        },
      ]);
    }

    if (chunk.type === 'crisis') {
      setCrisisLevel(chunk.level as 3 | 4);
      setMessages((prev) => [...prev, { role: 'crisis', content: chunk.response, ts: Date.now() }]);
    }

    if (chunk.type === 'done') {
      const content = assistantBuf.current;
      if (content) historyRef.current = [...historyRef.current, { role: 'assistant', content }];
      // Capture for TTS — we need the display text (not the raw JSON envelope)
      lastResponseRef.current = extractDisplayText(content);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.ts)
          return [...prev.slice(0, -1), { ...last, ts: Date.now() }];
        return prev;
      });
      assistantBuf.current = '';
      // Kick off the typing animation for the message we just finalised
      setAnimateLastMsg(true);
    }

    if (chunk.type === 'error') {
      const msg = chunk.message?.toLowerCase().includes('econnrefused') || chunk.message?.toLowerCase().includes('fetch failed')
        ? "Harmony's AI is offline. Please make sure Ollama is running (ollama serve) and try again."
        : `Something went wrong: ${chunk.message}`;
      setMessages((prev) => [...prev, { role: 'assistant', content: msg, ts: Date.now() }]);
    }
  }, []) as any;

  const { send, streaming } = useChatStream({ sessionId, onChunk });

  // Keep a ref to signals so the transcript auto-send can read the current value
  const signalsRef = useRef(signals);
  useEffect(() => { signalsRef.current = signals; }, [signals]);

  // ── Core send logic (accepts explicit text for STT auto-send) ─
  const doSend = useCallback(async (text: string) => {
    if (!text || streaming) return;
    if (text.length > 2000) return;

    setInput('');
    assistantBuf.current = '';
    setAnimateLastMsg(false);

    const textSentiment  = estimateTextSentiment(text);
    const currentSignals = { ...signalsRef.current, textSentiment };
    handleSignals({ textSentiment });

    setMessages((prev) => [...prev, { role: 'user', content: text, ts: Date.now() }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];

    await send(text, currentSignals, historyRef.current.slice(-6));
    inputRef.current?.focus();
  }, [streaming, handleSignals, send]);

  // Keep doSend in a ref so handleTranscript effect can call it without stale closure
  const doSendRef = useRef(doSend);
  useEffect(() => { doSendRef.current = doSend; }, [doSend]);

  // ── Auto-send when transcript arrives (STT → voice message) ──
  useEffect(() => {
    if (!pendingTranscript || streaming) return;
    const t = pendingTranscript;
    setPendingTranscript('');
    doSendRef.current(t);
  }, [pendingTranscript, streaming]);

  // ── Button click send ─────────────────────────────────────────
  async function handleSend() {
    await doSend(input.trim());
  }

  async function endSession() {
    await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' });
    router.push('/dashboard');
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {crisisLevel && (
        <CrisisScreen level={crisisLevel} trustedName={trustedContactName} onSafe={() => setCrisisLevel(null)} />
      )}

      <div className="page-wrapper">

        {/* ════════════════ LEFT PANEL — Voice ════════════════ */}
        <aside className="side-panel side-panel-left">
          <div className="panel-section">
            <p className="panel-label">🎤 Your voice</p>
            <VoiceBars volume={micVolume} active={micOn} />
            <p className="panel-hint">
              {micOn ? 'Listening…' : 'Enable mic to visualise'}
            </p>
          </div>

          <div className="panel-section" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p className="panel-label" style={{ margin: 0 }}>🤖 Harmony</p>
              {/* TTS toggle */}
              <button
                onClick={() => {
                  if (ttsEnabled) window.speechSynthesis?.cancel();
                  setTtsEnabled((v) => !v);
                }}
                title={ttsEnabled ? 'Mute Harmony voice' : 'Unmute Harmony voice'}
                style={{
                  background: 'none', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 13, padding: '2px 7px',
                  color: ttsEnabled ? 'var(--color-primary)' : 'var(--color-subtle)',
                  transition: 'all 0.15s',
                }}
              >
                {ttsEnabled ? (ttsSpeaking ? '🔊' : '🔈') : '🔇'}
              </button>
            </div>
            <HarmonyWave active={streaming || ttsSpeaking} />
            <p className="panel-hint">
              {ttsSpeaking ? 'Speaking…' : streaming ? 'Responding…' : ttsEnabled ? 'Voice on' : 'Voice off'}
            </p>
          </div>
        </aside>

        {/* ════════════════ CENTRE — Chat ════════════════ */}
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
              <button onClick={endSession} className="end-session-btn">End session</button>
            </div>
          </header>

          {/* Messages */}
          <div className="messages-area">
            {loadingHist ? (
              <div className="loading-skeleton">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-bubble"
                    style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', width: `${50 + i * 10}%` }}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 48, marginBottom: 16 }}>💙</div>
                <p>Share what&apos;s on your mind.</p>
                <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginTop: 6 }}>This is a safe space</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
                  animate={animateLastMsg && i === messages.length - 1 && m.role === 'assistant'}
                  onAnimDone={() => {
                    setAnimateLastMsg(false);
                    // Speak after the typing animation finishes for natural flow
                    if (lastResponseRef.current) speakText(lastResponseRef.current);
                  }}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Multimodal controls */}
          <div className="multimodal-area">
            <MultimodalControls
              onSignals={handleSignals}
              cameraVideoRef={cameraVideoRef}
              onCameraChange={handleCameraChange}
              onMicChange={handleMicChange}
              onMicLevel={handleMicLevel}
              onTranscript={handleTranscript}
            />
          </div>

          {/* Input */}
          <div className="input-area">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="What's on your mind…"
                  rows={1}
                  className="chat-input"
                  maxLength={2000}
                />
                {input.length > 1800 && (
                  <span style={{
                    position: 'absolute', right: 10, bottom: 8,
                    fontSize: 11, color: input.length > 1950 ? 'var(--color-danger)' : 'var(--color-subtle)',
                  }}>
                    {input.length}/2000
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="send-btn"
              >
                {streaming ? <span className="send-spinner" /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            <p className="disclaimer">Not a substitute for professional care. Crisis? iCall: 9152987821</p>
          </div>
        </div>

        {/* ════════════════ RIGHT PANEL — Camera ════════════════ */}
        <aside className="side-panel side-panel-right">
          <div className="panel-section">
            <p className="panel-label">📷 Face analysis</p>
            <div className="camera-feed-box">
              {/* Always in DOM so ref is valid; toggled visible by CSS */}
              <video
                ref={cameraVideoRef}
                muted
                playsInline
                style={{
                  width: '100%', borderRadius: 'var(--radius-lg)',
                  display: cameraOn ? 'block' : 'none',
                  transform: 'scaleX(-1)',   /* mirror — selfie view */
                  background: '#000',
                  aspectRatio: '4/3', objectFit: 'cover',
                }}
              />
              {!cameraOn && (
                <div className="camera-placeholder">
                  <span style={{ fontSize: 28, opacity: 0.35 }}>📷</span>
                  <p style={{ fontSize: 11, color: 'var(--color-subtle)', marginTop: 6 }}>Camera off</p>
                </div>
              )}
            </div>
            {cameraOn && (
              <p className="panel-hint" style={{ marginTop: 8 }}>Live emotion detection</p>
            )}
          </div>
        </aside>

      </div>

      <SOSButton />

      {/* ── Styles ───────────────────────────────────────────────── */}
      <style>{`
        /* ── Three-column page layout ── */
        .page-wrapper {
          display: flex;
          height: 100dvh;
          overflow: hidden;
        }

        .side-panel {
          display: none;          /* hidden by default (mobile) */
          flex-direction: column;
          width: 240px;
          flex-shrink: 0;
          padding: 1.25rem 1rem;
          overflow-y: auto;
        }
        .side-panel-left  { border-right: 1px solid var(--color-border); }
        .side-panel-right { border-left:  1px solid var(--color-border); }

        @media (min-width: 1200px) {
          .side-panel { display: flex; }
        }

        .panel-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1rem;
        }
        .panel-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .panel-hint {
          font-size: 11px;
          color: var(--color-subtle);
          margin-top: 8px;
        }

        .camera-feed-box {
          width: 100%;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .camera-placeholder {
          width: 100%;
          aspect-ratio: 4/3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--color-surface) 60%, transparent);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
        }

        /* ── Chat container ── */
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          max-width: 720px;
          margin: 0 auto;
        }

        .chat-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          backdrop-filter: blur(8px);
          background: color-mix(in srgb, var(--color-bg) 85%, transparent);
          position: sticky; top: 0; z-index: 10;
        }

        .end-session-btn {
          font-size: 12px; color: var(--color-muted);
          background: none; border: 1px solid var(--color-border);
          border-radius: var(--radius-sm); cursor: pointer;
          padding: 6px 12px; transition: all 0.15s;
        }
        .end-session-btn:hover { border-color: var(--color-border-2); color: var(--color-text); }

        .messages-area {
          flex: 1; overflow-y: auto; padding: 1rem;
          display: flex; flex-direction: column; gap: 12px;
          scroll-behavior: smooth;
        }

        .multimodal-area { padding: 0 1rem 0.5rem; flex-shrink: 0; }

        .input-area {
          padding: 0.5rem 1rem 1rem;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0; background: var(--color-bg);
        }

        .chat-input {
          width: 100%; resize: none; padding: 10px 14px;
          background: var(--color-surface); border: 1px solid var(--color-border-2);
          border-radius: var(--radius-md); color: var(--color-text);
          font-size: 14px; line-height: 1.5; outline: none;
          font-family: inherit; min-height: 42px; max-height: 120px;
          field-sizing: content;
        }
        .chat-input:focus { border-color: var(--color-primary); }

        .send-btn {
          width: 42px; height: 42px;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-primary); border: none;
          border-radius: var(--radius-md); color: #fff;
          cursor: pointer; flex-shrink: 0; transition: all 0.15s;
        }
        .send-btn:disabled { background: rgba(200,145,90,0.2); cursor: not-allowed; }

        .send-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .disclaimer {
          font-size: 11px; color: var(--color-subtle);
          margin-top: 6px; text-align: center;
        }

        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          flex: 1; color: var(--color-muted); font-size: 15px;
          text-align: center; padding: 2rem;
        }

        .loading-skeleton { display: flex; flex-direction: column; gap: 12px; padding: 1rem 0; }
        .skeleton-bubble  { height: 48px; background: var(--color-surface); border-radius: var(--radius-lg); animation: shimmer 1.5s ease-in-out infinite; }

        /* ── Message bubbles ── */
        .bubble-user {
          max-width: 80%; padding: 10px 14px;
          background: rgba(200,145,90,0.15);
          border: 1px solid rgba(200,145,90,0.25);
          border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
          font-size: 14px; line-height: 1.7;
        }
        .bubble-assistant {
          max-width: 85%; padding: 10px 14px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
          font-size: 14px; line-height: 1.7;
          min-height: 40px;  /* prevents collapsing during typewriter start */
        }
        .bubble-assistant p               { margin: 0 0 0.5em; }
        .bubble-assistant p:last-child    { margin-bottom: 0; }
        .bubble-assistant strong          { font-weight: 600; }
        .bubble-assistant em              { font-style: italic; }
        .bubble-assistant ul, .bubble-assistant ol { margin: 0.5em 0; padding-left: 1.5em; }

        .msg-time { font-size: 11px; color: var(--color-subtle); margin-top: 4px; }

        /* ── Typing indicator dots ── */
        .typing-dots {
          display: inline-flex; gap: 4px; align-items: center;
          padding: 2px 0; color: var(--color-muted); font-size: 10px; letter-spacing: 2px;
        }
        .typing-dots span { animation: pulse-dot 1.4s ease-in-out infinite both; }
        .typing-dots span:nth-child(2) { animation-delay: 0.25s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.5s; }

        .typing-indicator .dots span { animation: blink 1.4s infinite both; }
        .typing-indicator .dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator .dots span:nth-child(3) { animation-delay: 0.4s; }

        /* ── Keyframes ── */
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40%            { opacity: 1;    transform: scale(1);   }
        }
        @keyframes blink    { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
        @keyframes shimmer  { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }

        @media (max-width: 640px) {
          .chat-container { max-width: 100%; }
          .messages-area  { padding: 0.75rem; }
          .input-area     { padding: 0.5rem 0.75rem 0.75rem; }
          .multimodal-area { padding: 0 0.75rem 0.5rem; }
          .chat-header    { padding: 0.5rem 0.75rem; }
          .bubble-user, .bubble-assistant { max-width: 90%; }
        }
      `}</style>
    </>
  );
}
