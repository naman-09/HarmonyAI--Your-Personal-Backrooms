/**
 * Chunk all downloaded datasets into retrieval-ready pieces for pgvector.
 *
 * Input  (scripts/datasets/*.jsonl and legacy *.parquet / *.csv)
 * Output (scripts/datasets/chunks.jsonl — one chunk per line)
 *
 * Each chunk: { text: string, source: string, meta: object }
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/chunk-documents.ts
 */

import fs   from 'fs';
import path from 'path';

const DATASETS_DIR = path.resolve(__dirname, 'datasets');
const OUTPUT_FILE  = path.join(DATASETS_DIR, 'chunks.jsonl');

interface Chunk { text: string; source: string; meta: Record<string, any>; }

// ── GoEmotions label map ─────────────────────────────────────
const GO_LABEL: Record<number, string> = {
  0:'admiration',1:'amusement',2:'anger',3:'annoyance',4:'approval',
  5:'caring',6:'confusion',7:'curiosity',8:'desire',9:'disappointment',
  10:'disapproval',11:'disgust',12:'embarrassment',13:'excitement',14:'fear',
  15:'gratitude',16:'grief',17:'joy',18:'love',19:'nervousness',
  20:'optimism',21:'pride',22:'realization',23:'relief',24:'remorse',
  25:'sadness',26:'surprise',27:'neutral',
};

const DAIR_LABEL: Record<number, string> = {
  0:'sadness',1:'joy',2:'love',3:'anger',4:'fear',5:'surprise',
};

// Wellness-relevant GoEmotions (exclude trivial ones like amusement/pride for RAG)
const WELLNESS_LABELS = new Set([
  'anger','annoyance','caring','confusion','disappointment','disapproval',
  'disgust','embarrassment','fear','grief','nervousness','remorse','sadness',
  'joy','love','optimism','relief','realization','gratitude','excitement',
]);

// ── Processors ───────────────────────────────────────────────

function* processGoEmotions(filePath: string): Generator<Chunk> {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  let kept = 0;
  for (const line of lines) {
    let row: { text?: string; labels?: number[] };
    try { row = JSON.parse(line); } catch { continue; }

    const text   = (row.text || '').trim();
    const labels = (row.labels || []).map(Number);
    if (!text || labels.length === 0 || text.length < 15) continue;

    const names = labels.map((l) => GO_LABEL[l] || 'neutral').filter((n) => WELLNESS_LABELS.has(n));
    if (names.length === 0) continue; // skip purely trivial

    const emotionStr = names.join(', ');
    yield {
      text:   `Emotional context (${emotionStr}):\n"${text}"`,
      source: 'go_emotions',
      meta:   { emotions: names },
    };
    kept++;
  }
  console.log(`   GoEmotions: ${kept} wellness-relevant chunks from ${lines.length} samples`);
}

function* processEmpathyCounseling(filePath: string): Generator<Chunk> {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  let kept = 0;
  for (const line of lines) {
    let row: { input?: string; label?: string };
    try { row = JSON.parse(line); } catch { continue; }

    const input = (row.input || '').trim();
    const label = (row.label || '').trim();
    if (!input || !label || label.length < 30) continue;

    yield {
      text:   `Mental health support exchange:\nPerson: ${input}\nCounselor: ${label}`,
      source: 'empathetic_counseling',
      meta:   {},
    };
    kept++;
  }
  console.log(`   EmpathyCounseling: ${kept} chunks`);
}

function* processEmpathyDialogues(filePath: string): Generator<Chunk> {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  let kept = 0;
  for (const line of lines) {
    let row: { conversations?: Array<{role:string;content:string}>; emotion?: string; situation?: string };
    try { row = JSON.parse(line); } catch { continue; }

    const convo = row.conversations || [];
    const emotion = row.emotion || '';
    const situation = row.situation || '';
    if (convo.length < 2) continue;

    const turns = convo
      .map((t) => `${t.role === 'user' ? 'Person' : 'Harmony'}: ${t.content}`)
      .join('\n');

    const header = situation
      ? `Emotional situation (${emotion}): ${situation}\n\nSupportive conversation:`
      : `Conversation (emotion: ${emotion}):`;

    yield {
      text:   `${header}\n${turns}`,
      source: 'empathetic_dialogues',
      meta:   { emotion },
    };
    kept++;
  }
  console.log(`   EmpathyDialogues: ${kept} chunks`);
}

function* processEmotionTwitter(filePath: string): Generator<Chunk> {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  let kept = 0;
  for (const line of lines) {
    let row: { text?: string; label?: string | number };
    try { row = JSON.parse(line); } catch { continue; }

    const text = (row.text || '').trim();
    if (!text || text.length < 10) continue;
    // Downloader saves label as string name; legacy may be numeric id
    const emotion = typeof row.label === 'string'
      ? row.label
      : (DAIR_LABEL[Number(row.label)] || '');
    if (!emotion) continue;

    yield {
      text:   `Emotional expression (${emotion}): "${text}"`,
      source: 'emotion_twitter',
      meta:   { emotion },
    };
    kept++;
  }
  console.log(`   EmotionTwitter: ${kept} chunks`);
}

// ── Legacy CSV processor (EmpatheticDialogues CSV format) ───
function parseCSVLine(line: string): string[] {
  const r: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { if (inQ && line[i+1]==='"'){cur+='"';i++;} else inQ=!inQ; }
    else if (line[i] === ',' && !inQ) { r.push(cur); cur=''; }
    else cur += line[i];
  }
  r.push(cur); return r;
}

function* processLegacyCSV(filePath: string): Generator<Chunk> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines   = content.split('\n');
  if (lines.length < 2) return;
  const headers = parseCSVLine(lines[0]);
  const groups  = new Map<string, {ctx:string;emo:string;utts:string[]}>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    const vals = parseCSVLine(line);
    const row: Record<string,string> = {};
    headers.forEach((h,j) => { row[h.trim()] = (vals[j]||'').trim(); });
    const cid  = row.conv_id || '';
    const utt  = row.utterance || '';
    const ctx  = row.situation || '';
    const emo  = row.context   || '';
    if (!cid || !utt) continue;
    if (!groups.has(cid)) groups.set(cid, { ctx, emo, utts: [] });
    groups.get(cid)!.utts.push(utt);
  }
  let kept = 0;
  for (const [, data] of groups) {
    const convo = data.utts.join('\n');
    if (convo.length < 30) continue;
    const text = data.ctx
      ? `Context: ${data.ctx}\nEmotion: ${data.emo}\n\nConversation:\n${convo}`
      : `Emotion: ${data.emo}\n\nConversation:\n${convo}`;
    yield { text: text.slice(0, 2000), source: 'empathetic_dialogues', meta: { emotion: data.emo } };
    kept++;
  }
  console.log(`   Legacy EmpatheticDialogues CSV: ${kept} chunks`);
}

// ── Text splitter ────────────────────────────────────────────
function splitLong(chunks: Chunk[], maxLen = 900, overlap = 80): Chunk[] {
  const out: Chunk[] = [];
  for (const c of chunks) {
    if (c.text.length <= maxLen) { out.push(c); continue; }
    const paras = c.text.split(/\n\n+/);
    let cur = '';
    for (const p of paras) {
      if (cur.length + p.length + 2 > maxLen && cur.length > 0) {
        out.push({ ...c, text: cur.trim() });
        cur = cur.slice(-overlap) + '\n\n' + p;
      } else { cur += (cur ? '\n\n' : '') + p; }
    }
    if (cur.trim().length > 30) out.push({ ...c, text: cur.trim() });
  }
  return out;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Harmony — Document Chunker                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let all: Chunk[] = [];

  // ── New datasets (JSONL from HF Rows API) ──────────────────
  const goPath   = path.join(DATASETS_DIR, 'go_emotions.jsonl');
  const ecPath   = path.join(DATASETS_DIR, 'empathetic_counseling.jsonl');
  const edPath   = path.join(DATASETS_DIR, 'empathetic_dialogues_llm.jsonl');
  const etPath   = path.join(DATASETS_DIR, 'emotion_twitter.jsonl');

  if (fs.existsSync(goPath))  { console.log('Processing GoEmotions…');          all.push(...processGoEmotions(goPath)); }
  else console.log('⚠  go_emotions.jsonl not found — run download-hf-datasets.ts');

  if (fs.existsSync(ecPath))  { console.log('Processing EmpathyCounseling…');    all.push(...processEmpathyCounseling(ecPath)); }
  else console.log('⚠  empathetic_counseling.jsonl not found');

  if (fs.existsSync(edPath))  { console.log('Processing EmpathyDialogues LLM…'); all.push(...processEmpathyDialogues(edPath)); }
  else console.log('⚠  empathetic_dialogues_llm.jsonl not found');

  if (fs.existsSync(etPath))  { console.log('Processing EmotionTwitter…');       all.push(...processEmotionTwitter(etPath)); }
  else console.log('⚠  emotion_twitter.jsonl not found');

  // ── Legacy datasets (original RAG pipeline) ────────────────
  const legacyCSV = path.join(DATASETS_DIR, 'empathetic_dialogues.csv');
  if (fs.existsSync(legacyCSV)) {
    console.log('Processing legacy EmpatheticDialogues CSV…');
    all.push(...processLegacyCSV(legacyCSV));
  }

  // ── Split + dedup ──────────────────────────────────────────
  console.log(`\nRaw chunks: ${all.length}`);
  all = splitLong(all, 900, 80);
  console.log(`After split: ${all.length}`);

  const seen = new Set<string>();
  all = all.filter((c) => {
    const key = c.text.slice(0, 180);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`After dedup: ${all.length}`);

  // ── Stats by source ────────────────────────────────────────
  const bySrc = new Map<string, number>();
  for (const c of all) bySrc.set(c.source, (bySrc.get(c.source) || 0) + 1);
  console.log('\nBy source:');
  for (const [src, n] of [...bySrc].sort(([,a],[,b])=>b-a))
    console.log(`  ${src.padEnd(30)} ${n}`);

  // ── Write JSONL ────────────────────────────────────────────
  const w = fs.createWriteStream(OUTPUT_FILE);
  for (const c of all) w.write(JSON.stringify(c) + '\n');
  await new Promise<void>((res, rej) => w.end((e: Error) => e ? rej(e) : res()));

  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(0);
  console.log(`\n✓ Written ${all.length} chunks → ${path.relative(process.cwd(), OUTPUT_FILE)} (${sizeKB} KB)`);
  console.log('\nNext step: npm run rag:embed');
}

main().catch((err) => { console.error(err); process.exit(1); });
