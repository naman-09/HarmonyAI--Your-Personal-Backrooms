import OpenAI from 'openai';
import { safetyCheck } from './safety';
import { retrieveContext, formatRAGContext } from './rag';
import type { EmotionSignals } from './emotion';
import { describeEmotionSignals } from './emotion';

// Point the OpenAI client at Ollama's OpenAI-compatible API
const client = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : 'http://localhost:11434/v1',
  apiKey:  'ollama',
});

const MODEL       = process.env.OLLAMA_MODEL       || 'gemma4:31b-cloud';
const MAX_TOKENS  = Number(process.env.OLLAMA_MAX_TOKENS)  || 1200;
const TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE) || 0.7;
const MAX_RETRIES = 2;
const TIMEOUT_MS  = 120_000; // cloud-routed models have cold-start latency; local models are slower

// Cloud-routed models (e.g. gemma4:31b-cloud) are served by Ollama's cloud backend.
// They only need Ollama to be reachable — the cloud router handles inference.
// Local models must be present in the pulled-models list.
const IS_CLOUD_MODEL = MODEL.endsWith('-cloud') || MODEL.includes(':cloud');

async function canUseConfiguredModel(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;

    // Cloud model: Ollama being reachable is enough — cloud handles the rest
    if (IS_CLOUD_MODEL) return true;

    // Local model: verify it is actually pulled
    const data = await res.json() as { models?: Array<{ name?: string }> };
    return !!data.models?.some((m) => m.name === MODEL);
  } catch {
    return false;
  }
}

function buildOfflineFallback(input: HarmonyInput): string {
  const text = input.text.toLowerCase();
  const isExamStress = /\b(exam|test|study|studies|assignment)\b/.test(text);
  const isAnxious = /\b(anxious|anxiety|panic|scared|worried|stress|stressed|overwhelmed)\b/.test(text);
  const isAngry = /\b(angry|furious|rage|hate|frustrated)\b/.test(text);

  if (isExamStress || isAnxious) {
    return "That sounds really heavy, and it makes sense that your mind is running fast right now. Try one small reset: breathe in for 4, hold for 4, breathe out for 4, then pick just the next tiny study step. What part feels most urgent at this moment?";
  }

  if (isAngry) {
    return "I hear how intense that feels. Before you do anything with that energy, try unclenching your jaw, dropping your shoulders, and taking three slower breaths so your body gets a little room. What happened right before the anger spiked?";
  }

  return "I am here with you. The local AI model is not available right now, but you do not have to hold this alone in the meantime. What feels hardest about this right now?";
}

function shouldUseFallback(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('requires more system memory') ||
    normalized.includes('model') ||
    normalized.includes('econnrefused') ||
    normalized.includes('fetch failed') ||
    normalized.includes('aborted') ||
    normalized.includes('timeout');
}

// ─── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Harmony, a warm and emotionally intelligent wellness companion. You think quickly, respond naturally, and genuinely care about the person you're talking to.

RESPONSE FORMAT — always reply with valid JSON:
{
  "validation": "one sentence acknowledging their feeling",
  "question": "one thoughtful follow-up question or null",
  "techniques": ["technique if relevant, otherwise empty array"],
  "safety_level": 0,
  "response_text": "your full warm conversational reply — THIS IS THE MOST IMPORTANT FIELD"
}

CRITICAL: response_text is the ONLY field the user sees. It MUST contain your complete reply. NEVER leave it empty or as "". Put your ENTIRE conversational response in response_text.

HOW TO WRITE response_text:

Write like a smart, caring friend — not a therapist, not a robot
Use emojis naturally, the way a real person would 💙 — not excessively
Keep responses concise but warm — 2-4 sentences usually enough
Ask one good question to go deeper, never multiple questions at once
Validate first, always — before any advice or techniques
Be language-aware — detect the user's language and respond in the same language automatically, whether Hindi, English, Spanish, Arabic, or any other
If someone switches languages mid conversation, switch with them naturally
Never sound clinical or scripted
Think out loud sometimes — 'Hmm, that's interesting...' or 'Okay so...'
Use line breaks to make responses easy to read on mobile

TONE EXAMPLES:
Too robotic: 'I acknowledge your feelings of anxiety. Here is a technique.'
Just right: 'Anxiety before exams is so real 😮💨 Your brain is basically running 10 tabs at once. What's stressing you out the most right now?'
Too long: Three paragraphs of advice
Just right: Validate in one line, ask one question, offer one technique if needed

TECHNIQUES LIBRARY (pick the most relevant one or two, never list all of them):
BREATHING:
  Box breathing 4-4-4-4 (rage, intense stress)
  4-7-8 breathing (anxiety, sleep issues)
  Diaphragmatic breathing (general calm)
  Pursed lip breathing (panic, shortness of breath)
  Alternate nostril breathing (scattered thoughts)

GROUNDING:
  5-4-3-2-1 senses (panic, dissociation)
  Body scan (tension, numbness)
  Cold water on wrists or face (acute distress)
  Feet flat on floor, feel the ground (overwhelm)
  Name 5 things you can see right now (anxiety spiral)

MOVEMENT:
  Shake your body out (stored tension, anger)
  Slow walk, notice each step (overthinking)
  Progressive muscle relaxation (physical tension)
  Stretching, especially neck and shoulders (stress)
  Dance to one song (low mood, stuck energy)

COGNITIVE:
  Brain dump — write everything, then pick one thing (overwhelm)
  Worry window — schedule 15 mins to worry, postpone till then (anxiety)
  Thought record — what am I assuming, is it fact or feeling (negative spiral)
  Best/worst/most likely scenario (catastrophising)
  Reframe — what would I tell a friend in this situation (self criticism)

BEHAVIOURAL:
  One tiny action, smallest possible step (depression, low energy)
  Opposite action — do the opposite of the urge (avoidance)
  Pleasure scheduling — plan one enjoyable thing today (sadness)
  Social connection — reach out to one person (isolation)
  Limit doom scrolling, set a timer (anxiety, comparison)

SELF COMPASSION:
  Self compassion break — this is hard, I'm not alone, be kind to myself
  Write a letter to yourself as a friend (shame, guilt)
  Loving kindness meditation (anger at self or others)
  Gratitude — name 3 specific things, not generic (low mood)
  Mirror work — say one kind thing to yourself (low self worth)

SAFETY LEVELS (set in the JSON):
  0 = normal session
  1 = elevated concern — validate, offer resources, ask how they're coping
  2 = NEVER set this yourself — the safety system handles level 2 before you respond

CRISIS SUPPORT — India focused (use when safety_level is 1):
SUICIDE & MENTAL HEALTH CRISIS:
  iCall (TISS): 9152987821 — Mon-Sat, 8am-10pm
  Vandrevala Foundation: 1860-2662-345 — 24/7, free, multilingual
  AASRA: 9820466627 — 24/7
  Snehi: 044-24640050 — 24/7
  Fortis Stress Helpline: 8376804102

WOMEN IN DISTRESS:
  Women Helpline: 1091 — 24/7
  Shakti Shalini: 011-24373737

CHILDREN & YOUTH:
  Childline: 1098 — 24/7, free
  YourDOST: yourdost.com — online counselling

DOMESTIC VIOLENCE:
  National Domestic Violence: 181 — 24/7

EMERGENCY:
  Police: 100
  Ambulance: 108
  All emergency: 112

When mentioning crisis resources, don't dump the whole list. Pick the most relevant one or two based on what the person is going through and mention them warmly and naturally, not like a disclaimer.`;

// ─── Types ────────────────────────────────────────────────────
export interface HarmonyInput {
  text:           string;
  emotionSignals: EmotionSignals;
  history:        Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?:     string;
  userId?:        number;
}

export interface UsageSummary {
  input_tokens:  number;
  output_tokens: number;
}

export type StreamChunk =
  | { type: 'delta';   text: string }
  | { type: 'replace'; text: string }
  | { type: 'alert';   level: 2 }                                        // Level 2: AI still responds, route triggers SMS
  | { type: 'crisis';  response: string; triggers: string[]; level: 3 | 4 } // Level 3/4: AI intercepted
  | { type: 'done';    usage: UsageSummary; safetyLevel: number }
  | { type: 'error';   message: string };

// ─── JSON extraction helper ───────────────────────────────────
// The model sometimes wraps JSON in markdown code fences or adds preamble text.
// Try several strategies before giving up.
function tryParseHarmonyResponse(
  raw: string,
): { response_text?: string; validation?: string; question?: string } | null {
  // 1. Direct parse
  try { return JSON.parse(raw); } catch { /* try next */ }

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  if (stripped !== raw) {
    try { return JSON.parse(stripped); } catch { /* try next */ }
  }

  // 3. Find the outermost { ... } in the response
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* try next */ }
  }

  return null;
}

// ─── Main streaming function ──────────────────────────────────
export async function* streamHarmonyResponse(
  input: HarmonyInput
): AsyncGenerator<StreamChunk> {
  // 1. Safety gate — runs BEFORE the model, always
  const risk = await safetyCheck(input.text, {
    sessionId: input.sessionId,
    userId:    input.userId,
  });

  // 2. Level 3 / 4 — model never responds; pre-canned crisis response
  if (risk.level >= 3) {
    yield {
      type:     'crisis',
      response: risk.response!,
      triggers: risk.triggers,
      level:    risk.level as 3 | 4,
    };
    return;
  }

  // 3. Level 2 — model responds WITH extra warmth, but route also fires SMS
  if (risk.level === 2) {
    yield { type: 'alert', level: 2 };
    // Continue to AI below — the model will respond with compassion
  }

  // 4. RAG — retrieve relevant knowledge (non-blocking, graceful fallback)
  let ragContext = '';
  try {
    const ragResults = await retrieveContext(input.text);
    ragContext = formatRAGContext(ragResults);
  } catch {
    // RAG unavailable — continue without it
  }

  // 5. Build messages
  const contextWindow = input.history.slice(-6);

  const noteLines: string[] = [
    `Message: "${input.text}"`,
    `Multimodal emotion signals: ${describeEmotionSignals(input.emotionSignals)}`,
  ];

  if (risk.level === 1) noteLines.push(`\nNote: elevated concern detected — respond at safety_level 1 with extra warmth and subtly mention iCall (9152987821)`);
  if (risk.level === 2) noteLines.push(`\nNote: distress detected — respond with maximum compassion, the person is struggling significantly`);

  if (ragContext) noteLines.push(ragContext);

  const userContent = noteLines.filter(Boolean).join('\n');

  if (!(await canUseConfiguredModel())) {
    yield { type: 'replace', text: buildOfflineFallback(input) };
    yield {
      type:        'done',
      usage:       { input_tokens: 0, output_tokens: 0 },
      safetyLevel: risk.level,
    };
    return;
  }

  // 6. Call Ollama — non-streaming so only the parsed response_text is ever sent to the client.
  //    Streaming raw JSON fragments causes "gibberish" in the chat bubble; this approach
  //    waits for the full completion, parses the JSON, and emits a single clean replace chunk.
  const apiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...contextWindow,
    { role: 'user' as const,   content: userContent },
  ];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const completion = await client.chat.completions.create({
        model:       MODEL,
        max_tokens:  MAX_TOKENS,
        temperature: TEMPERATURE,
        stream:      false,
        messages:    apiMessages,
      }, { signal: controller.signal as any });

      clearTimeout(timeoutId);

      const fullResponse = completion.choices[0]?.message?.content ?? '';
      const inputTokens  = completion.usage?.prompt_tokens     ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;

      // Extract the clean conversational reply from the model's JSON envelope
      const harmonyJson = tryParseHarmonyResponse(fullResponse);
      let displayText   = '';

      if (harmonyJson) {
        displayText = typeof harmonyJson.response_text === 'string'
          ? harmonyJson.response_text.trim()
          : '';

        // Fallback: stitch validation + question if response_text is missing
        if (!displayText) {
          if (typeof harmonyJson.validation === 'string' && harmonyJson.validation.trim()) {
            displayText = harmonyJson.validation.trim();
          }
          if (typeof harmonyJson.question === 'string' && harmonyJson.question.trim()) {
            displayText += (displayText ? '\n\n' : '') + harmonyJson.question.trim();
          }
        }
      }

      // Last resort: model returned plain text instead of JSON — use it directly
      if (!displayText) displayText = fullResponse.trim();

      yield { type: 'replace', text: displayText };
      yield {
        type:        'done',
        usage:       { input_tokens: inputTokens, output_tokens: outputTokens },
        safetyLevel: risk.level,
      };
      return;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const isRetryable =
        message.includes('ECONNREFUSED') ||
        message.includes('fetch failed')  ||
        message.includes('aborted')       ||
        message.includes('timeout');

      if (isRetryable && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1_500 * (attempt + 1)));
        continue;
      }

      if (shouldUseFallback(message)) {
        yield { type: 'replace', text: buildOfflineFallback(input) };
        yield {
          type:        'done',
          usage:       { input_tokens: 0, output_tokens: 0 },
          safetyLevel: risk.level,
        };
        return;
      }

      yield { type: 'error', message: 'Harmony could not respond right now. Please try again in a moment.' };
      return;
    }
  }
}

// ─── Title generation ────────────────────────────────────────
// Generates a concise 3-6 word title for a chat after the first user/assistant
// exchange. Non-blocking — callers should `.catch(() => {})` and not await.
export async function generateChatTitle(
  firstUserMessage: string,
  firstAssistantReply: string,
): Promise<string | null> {
  if (!firstUserMessage.trim()) return null;

  // Heuristic fallback used when the model can't be reached
  const heuristic = firstUserMessage
    .replace(/[\n\r]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s,.'-]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');

  const canUse = await canUseConfiguredModel();
  if (!canUse) return heuristic || 'New conversation';

  const prompt = `Summarize this conversation into a SHORT chat title — 3 to 6 words MAX, no quotes, no punctuation at the end, no emoji, capitalize like a sentence (only the first word).

Person: ${firstUserMessage.slice(0, 400)}
Harmony: ${firstAssistantReply.slice(0, 400)}

Title (3-6 words):`;

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 24,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 20_000 });

    const raw = res.choices?.[0]?.message?.content?.trim() ?? '';
    // Strip quotes, leading "Title:" prefix, trailing punctuation
    const cleaned = raw
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^title\s*:\s*/i, '')
      .replace(/[.?!]+$/, '')
      .trim()
      .slice(0, 60);

    return cleaned || heuristic || 'New conversation';
  } catch {
    return heuristic || 'New conversation';
  }
}
