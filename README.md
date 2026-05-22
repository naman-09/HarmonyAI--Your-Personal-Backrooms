# Harmony AI

A production-grade mental wellness companion built with Next.js 14, Claude, and real-time multimodal emotion analysis.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| AI | Anthropic Claude (server-side, streamed SSE) |
| Database | Vercel Postgres + Drizzle ORM |
| Cache / Rate limiting | Upstash Redis |
| Auth | JWT via `jose` (httpOnly cookie) |
| Voice analysis | Web Audio API (real autocorrelation) |
| Face analysis | face-api.js (TinyFaceDetector) |
| UI | Tailwind CSS + Framer Motion |
| Deploy | Vercel |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/your-org/harmony-ai
cd harmony-ai
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in all values — see .env.example for descriptions
```

### 3. Download face model weights

```bash
bash scripts/download-models.sh
```

### 4. Set up the database

```bash
# Push schema to Vercel Postgres
npm run db:push
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:3000
```

---

## Deploy to Vercel

```bash
# Create secrets in Vercel dashboard first, then:
vercel --prod
```

Make sure the following secrets exist in your Vercel project:
- `@anthropic-key`
- `@jwt-secret`
- `@postgres-url`
- `@upstash-redis-url`
- `@upstash-redis-token`

---

## Architecture

```
Browser
  │
  ├─ GET  /dashboard          → session list
  ├─ POST /api/sessions       → create session
  ├─ POST /api/chat           → SSE streaming (replaces Socket.io)
  │     │
  │     ├─ JWT middleware     → verify token, inject x-user-id
  │     ├─ Rate limiter       → 20 msgs/min via Upstash
  │     ├─ Safety gate        → crisis patterns checked BEFORE Claude
  │     ├─ Claude stream      → SSE chunks → client
  │     └─ Postgres + Redis   → persist messages, cache session
  │
  └─ Multimodal (client-only)
        ├─ Web Audio API      → pitch + volume (real autocorrelation)
        └─ face-api.js        → anger / expression detection
```

### Key decisions

**No Socket.io** — replaced by Next.js native `ReadableStream` SSE. Works on Vercel Edge without any extra config, fewer dependencies.

**Safety before Claude** — the safety layer runs synchronously before every Claude API call. A crisis-level message never reaches the model; it gets a pre-canned response with localised crisis line numbers and is logged to an append-only audit table.

**Server-only API key** — `ANTHROPIC_API_KEY` has no `NEXT_PUBLIC_` prefix. It never appears in the browser bundle.

**Normalised emotion scoring** — all signals are normalised to 0–1 before weighting. Text is the primary signal (0.45 weight); face and voice are corroborating. When the camera is off, text weight increases to 0.70.

---

## Safety

Harmony includes a pre-flight crisis detection layer (`src/lib/safety.ts`) that:

- Screens every user message against crisis and elevated-concern patterns
- Bypasses Claude entirely for crisis-level responses
- Logs all crisis events to an append-only `audit_log` table
- Flags sessions in Redis for fast lookup

**This is not a medical device.** Before launching in a production mental health context you must:

- Have a licensed mental health professional review the system prompt and safety patterns
- Add HIPAA-compliant data storage if serving US users
- Add at-rest encryption for message content
- Publish Terms of Service stating this is not a therapy substitute
- Test crisis detection coverage thoroughly

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login/      POST  — login, set JWT cookie
│   │   ├── auth/logout/     POST  — clear cookie
│   │   ├── sessions/        GET   — list | POST — create
│   │   ├── sessions/[id]/   GET   — detail | PATCH — end
│   │   └── chat/            POST  — SSE streaming endpoint
│   ├── dashboard/           session list UI
│   ├── chat/[id]/           chat UI
│   └── login/               login page
├── components/
│   ├── emotion-meter.tsx    animated ring with Framer Motion
│   ├── multimodal-controls  mic + camera toggle, polling loop
│   └── chat-stream.tsx      SSE consumer hook
└── lib/
    ├── ai.ts                Claude streaming engine
    ├── auth.ts              JWT sign/verify (jose)
    ├── db.ts                Drizzle schema (corrected)
    ├── emotion.ts           normalised scoring
    ├── face.ts              face-api.js with error boundary
    ├── redis.ts             rate limiting + session cache
    ├── safety.ts            crisis detection + audit logging
    └── voice.ts             Web Audio API analysis
```

---

## License

MIT
