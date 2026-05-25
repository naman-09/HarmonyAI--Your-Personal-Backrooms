'use client';

import { useCallback, useRef, useState } from 'react';
import type { EmotionSignals } from '@/lib/emotion';

// Expanded to include new alert (level 2) and crisis-with-level chunks
export type StreamMessage =
  | { type: 'delta';  text: string }
  | { type: 'replace'; text: string }
  | { type: 'alert';  level: 2 }
  | { type: 'crisis'; response: string; triggers: string[]; level: 3 | 4 }
  | { type: 'done' }
  | { type: 'error';  message: string };

interface UseChatStreamOptions {
  sessionId: string;
  onChunk:   (chunk: StreamMessage) => void;
}

export function useChatStream({ sessionId, onChunk }: UseChatStreamOptions) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      text:           string,
      emotionSignals: EmotionSignals,
      history:        Array<{ role: 'user' | 'assistant'; content: string }>,
      userContext?:   Record<string, unknown>,
    ) => {
      if (streaming) return;

      abortRef.current = new AbortController();
      setStreaming(true);

      try {
        const res = await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          signal:  abortRef.current.signal,
          body:    JSON.stringify({ sessionId, text, emotionSignals, history, userContext }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          onChunk({ type: 'error', message: data.error ?? `HTTP ${res.status}` });
          return;
        }

        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const chunk = JSON.parse(line.slice(6)) as StreamMessage;
              onChunk(chunk);
            } catch {
              // malformed SSE line — skip
            }
          }
        }

        onChunk({ type: 'done' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onChunk({ type: 'error', message: 'Connection lost' });
        }
      } finally {
        setStreaming(false);
      }
    },
    [sessionId, streaming, onChunk]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { send, abort, streaming };
}
