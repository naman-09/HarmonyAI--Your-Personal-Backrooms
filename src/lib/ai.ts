import OpenAI from 'openai';
import { safetyCheck } from './safety';
import type { EmotionSignals } from './emotion';

// Point the OpenAI client at Ollama's OpenAI-compatible API
const client = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : 'http://localhost:11434/v1',
  apiKey:  'ollama',
});

const MODEL      = process.env.OLLAMA_MODEL      || 'llama3.1:8b';
const MAX_TOKENS = Number(process.env.OLLAMA_MAX_TOKENS) || 800;

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

  // 4. Build messages
  const contextWindow = input.history.slice(-6);

  const noteLines: string[] = [
    `Message: "${input.text}"`,
    `Emotion signals:`,
    `  voice_pitch=${input.emotionSignals.voicePitch}Hz`,
    `  voice_volume=${input.emotionSignals.voiceVolume.toFixed(1)}`,
    `  face_anger=${input.emotionSignals.faceAnger.toFixed(3)}`,
    `  text_sentiment=${input.emotionSignals.textSentiment.toFixed(3)}`,
    `  face_available=${input.emotionSignals.faceAvailable}`,
  ];

  if (risk.level === 1) noteLines.push(`\nNote: elevated concern detected — respond at safety_level 1 with extra warmth and subtly mention iCall (9152987821)`);
  if (risk.level === 2) noteLines.push(`\nNote: distress detected — respond with maximum compassion, the person is struggling significantly`);

  const userContent = noteLines.filter(Boolean).join('\n');

  // 5. Stream from Ollama
  try {
    const stream = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      stream:     true,
      messages:   [
        { role: 'system', content: SYSTEM_PROMPT },
        ...contextWindow,
        { role: 'user',   content: userContent },
      ],
    });

    let inputTokens  = 0;
    let outputTokens = 0;
    let fullResponse = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        yield { type: 'delta', text: delta };
      }

      if (chunk.usage) {
        inputTokens  = chunk.usage.prompt_tokens     ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    try {
      const parsed = JSON.parse(fullResponse);
      if (parsed && typeof parsed === 'object') {
        let displayText = typeof parsed.response_text === 'string' ? parsed.response_text.trim() : '';

        if (!displayText) {
          if (typeof parsed.validation === 'string' && parsed.validation.trim()) {
            displayText = parsed.validation.trim();
          }
          if (typeof parsed.question === 'string' && parsed.question.trim()) {
            displayText += (displayText ? '\n\n' : '') + parsed.question.trim();
          }
        }

        if (displayText) {
          yield { type: 'replace', text: displayText };
        }
      }
    } catch {
      // Not valid JSON — leave the raw text as-is (already streamed)
    }

    yield {
      type:        'done',
      usage:       { input_tokens: inputTokens, output_tokens: outputTokens },
      safetyLevel: risk.level,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    yield { type: 'error', message };
  }
}
