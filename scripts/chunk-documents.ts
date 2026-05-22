/**
 * Phase A2 — Chunk downloaded datasets into retrieval-ready pieces
 *
 * Reads CSV/Parquet files from scripts/datasets/ and outputs
 * a single JSONL file: scripts/datasets/chunks.jsonl
 *
 * Each line: { "text": "...", "source": "dataset_name", "meta": { ... } }
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/chunk-documents.ts
 */

import fs from 'fs';
import path from 'path';

const DATASETS_DIR = path.resolve(__dirname, 'datasets');
const OUTPUT_FILE  = path.join(DATASETS_DIR, 'chunks.jsonl');

interface Chunk {
  text:   string;
  source: string;
  meta:   Record<string, any>;
}

// ─── CSV parser (simple, handles quoted fields) ──────────────
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Parquet reader (uses plain JSON fallback or raw text) ───
// For simplicity without native parquet bindings, we'll use
// the HuggingFace datasets API to read parquet as JSON.
async function readParquetViaAPI(filePath: string): Promise<any[]> {
  // Try reading as JSON first (some HF exports are JSON-lines)
  const content = fs.readFileSync(filePath);

  // Check if it starts with typical parquet magic bytes "PAR1"
  if (content.slice(0, 4).toString() === 'PAR1') {
    console.log(`   ℹ  Parquet file detected — will use HuggingFace API fallback`);
    return [];
  }

  // Try as JSONL
  try {
    const lines = content.toString('utf-8').split('\n').filter(Boolean);
    return lines.map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// ─── Dataset processors ──────────────────────────────────────
function processEmpatheticDialogues(rows: Record<string, string>[]): Chunk[] {
  const chunks: Chunk[] = [];
  const grouped = new Map<string, { context: string; emotion: string; utterances: string[] }>();

  for (const row of rows) {
    const convId = row['conv_id'] || row['conversation_id'] || '';
    const utterance = row['utterance'] || row['text'] || '';
    const context = row['situation'] || row['prompt'] || '';
    const emotion = row['context'] || row['emotion'] || '';

    if (!convId || !utterance) continue;

    if (!grouped.has(convId)) {
      grouped.set(convId, { context, emotion, utterances: [] });
    }
    grouped.get(convId)!.utterances.push(utterance);
  }

  for (const [convId, data] of grouped) {
    const convo = data.utterances.join('\n');
    if (convo.length < 30) continue;

    // Chunk by conversation (natural boundary)
    const text = data.context
      ? `Context: ${data.context}\nEmotion: ${data.emotion}\n\nConversation:\n${convo}`
      : `Emotion: ${data.emotion}\n\nConversation:\n${convo}`;

    chunks.push({
      text: text.slice(0, 2000), // cap at 2000 chars per chunk
      source: 'empathetic_dialogues',
      meta: { convId, emotion: data.emotion },
    });
  }

  return chunks;
}

function processCounselChat(rows: any[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const row of rows) {
    const question = row.questionTitle || row.question || row.questionText || '';
    const answer = row.answerText || row.answer || row.therapistResponse || '';
    const topic = row.topic || row.category || '';

    if (!question || !answer || answer.length < 50) continue;

    const text = topic
      ? `Topic: ${topic}\n\nQ: ${question}\n\nA: ${answer}`
      : `Q: ${question}\n\nA: ${answer}`;

    chunks.push({
      text: text.slice(0, 2000),
      source: 'counsel_chat',
      meta: { topic },
    });
  }

  return chunks;
}

function processMentalHealthFAQ(rows: any[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const row of rows) {
    const question = row.question || row.input || row.Context || '';
    const answer = row.answer || row.output || row.Response || '';

    if (!question || !answer || answer.length < 30) continue;

    chunks.push({
      text: `Q: ${question}\n\nA: ${answer}`.slice(0, 2000),
      source: 'mental_health_faq',
      meta: {},
    });
  }

  return chunks;
}

// ─── Text splitter for long chunks ───────────────────────────
function splitLongChunks(chunks: Chunk[], maxLen = 1000, overlap = 100): Chunk[] {
  const result: Chunk[] = [];

  for (const chunk of chunks) {
    if (chunk.text.length <= maxLen) {
      result.push(chunk);
      continue;
    }

    // Split on paragraph boundaries
    const paragraphs = chunk.text.split(/\n\n+/);
    let current = '';

    for (const para of paragraphs) {
      if (current.length + para.length + 2 > maxLen && current.length > 0) {
        result.push({ ...chunk, text: current.trim() });
        // Keep overlap from end of current
        current = current.slice(-overlap) + '\n\n' + para;
      } else {
        current += (current ? '\n\n' : '') + para;
      }
    }

    if (current.trim().length > 30) {
      result.push({ ...chunk, text: current.trim() });
    }
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== Harmony RAG — Document Chunker ===\n');

  let allChunks: Chunk[] = [];

  // 1. EmpatheticDialogues (CSV)
  const edPath = path.join(DATASETS_DIR, 'empathetic_dialogues.csv');
  if (fs.existsSync(edPath)) {
    console.log('Processing EmpatheticDialogues...');
    const content = fs.readFileSync(edPath, 'utf-8');
    const rows = parseCSV(content);
    const chunks = processEmpatheticDialogues(rows);
    console.log(`   → ${chunks.length} chunks from EmpatheticDialogues`);
    allChunks.push(...chunks);
  } else {
    console.log('⚠  empathetic_dialogues.csv not found — skipping');
  }

  // 2. Counsel Chat (Parquet → try API fallback)
  const ccPath = path.join(DATASETS_DIR, 'counsel_chat.parquet');
  if (fs.existsSync(ccPath)) {
    console.log('Processing Counsel Chat...');
    const rows = await readParquetViaAPI(ccPath);
    if (rows.length > 0) {
      const chunks = processCounselChat(rows);
      console.log(`   → ${chunks.length} chunks from Counsel Chat`);
      allChunks.push(...chunks);
    } else {
      console.log('   ℹ  Parquet requires conversion — run download with JSON format or use HF API');
    }
  } else {
    console.log('⚠  counsel_chat.parquet not found — skipping');
  }

  // 3. Mental Health FAQ (Parquet)
  const faqPath = path.join(DATASETS_DIR, 'mental_health_faq.parquet');
  if (fs.existsSync(faqPath)) {
    console.log('Processing Mental Health FAQ...');
    const rows = await readParquetViaAPI(faqPath);
    if (rows.length > 0) {
      const chunks = processMentalHealthFAQ(rows);
      console.log(`   → ${chunks.length} chunks from Mental Health FAQ`);
      allChunks.push(...chunks);
    } else {
      console.log('   ℹ  Parquet requires conversion — run download with JSON format or use HF API');
    }
  } else {
    console.log('⚠  mental_health_faq.parquet not found — skipping');
  }

  // 4. Split long chunks
  console.log(`\nTotal raw chunks: ${allChunks.length}`);
  allChunks = splitLongChunks(allChunks, 1000, 100);
  console.log(`After splitting: ${allChunks.length} chunks`);

  // 5. Deduplicate
  const seen = new Set<string>();
  allChunks = allChunks.filter((c) => {
    const key = c.text.slice(0, 200);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`After dedup: ${allChunks.length} chunks`);

  // 6. Write JSONL
  const writer = fs.createWriteStream(OUTPUT_FILE);
  for (const chunk of allChunks) {
    writer.write(JSON.stringify(chunk) + '\n');
  }
  writer.end();

  console.log(`\n✓ Written to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`  Total chunks: ${allChunks.length}`);

  // Stats by source
  const bySrc = new Map<string, number>();
  for (const c of allChunks) {
    bySrc.set(c.source, (bySrc.get(c.source) || 0) + 1);
  }
  for (const [src, count] of bySrc) {
    console.log(`  ${src}: ${count}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
