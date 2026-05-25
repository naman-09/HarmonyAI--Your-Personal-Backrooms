/**
 * Download emotional-intelligence datasets from HuggingFace.
 *
 * GoEmotions: already downloaded via Rows API → go_emotions.jsonl
 * Others:     read parquet files directly via HF CDN using hyparquet
 *             (asyncBufferFromUrl makes range requests — no full download needed)
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/download-hf-datasets.ts
 */

import fs   from 'fs';
import path from 'path';
// hyparquet is ESM-only — load lazily so tsx (CJS host) can resolve it
let _hyparquet: Awaited<typeof import('hyparquet')> | null = null;
async function loadHyparquet() {
  if (!_hyparquet) _hyparquet = await import('hyparquet');
  return _hyparquet;
}

const DATASETS_DIR = path.resolve(__dirname, 'datasets');

// dair-ai/emotion label map
const DAIR_LABEL: Record<number, string> = {
  0: 'sadness', 1: 'joy', 2: 'love', 3: 'anger', 4: 'fear', 5: 'surprise',
};

interface DatasetSpec {
  name:     string;
  url:      string;
  jsonlOut: string;
  limit:    number;
  transform(row: Record<string, unknown>): string | null;
}

const SPECS: DatasetSpec[] = [
  // ── EmpathyCounseling ────────────────────────────────────────
  {
    name:    'EmpathyCounseling',
    url:     'https://huggingface.co/datasets/LuangMV97/Empathetic_counseling_Dataset/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet',
    jsonlOut: 'empathetic_counseling.jsonl',
    limit:   5000,
    transform(row) {
      const input = String(row.input  ?? '').trim();
      const label = String(row.label  ?? '').trim();
      if (!input || !label || label.length < 20) return null;
      return JSON.stringify({ input, label });
    },
  },
  // ── EmpathyDialogues LLM ─────────────────────────────────────
  {
    name:    'EmpathyDialogues',
    url:     'https://huggingface.co/datasets/Estwld/empathetic_dialogues_llm/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet',
    jsonlOut: 'empathetic_dialogues_llm.jsonl',
    limit:   3000,
    transform(row) {
      // conversations field is a list of {role, content} maps
      let convos: Array<{ role: string; content: string }> = [];
      try {
        const raw = row.conversations;
        if (Array.isArray(raw)) {
          convos = (raw as any[]).map((item: any) => ({
            role:    String(item.role    ?? ''),
            content: String(item.content ?? ''),
          }));
        } else if (typeof raw === 'string') {
          convos = JSON.parse(raw);
        }
      } catch { return null; }
      if (convos.length < 2) return null;
      const emotion   = String(row.emotion   ?? '').trim();
      const situation = String(row.situation ?? '').trim();
      return JSON.stringify({ conversations: convos, emotion, situation });
    },
  },
  // ── Emotion Twitter (dair-ai) ────────────────────────────────
  {
    name:    'EmotionTwitter',
    url:     'https://huggingface.co/datasets/dair-ai/emotion/resolve/refs%2Fconvert%2Fparquet/split/train/0000.parquet',
    jsonlOut: 'emotion_twitter.jsonl',
    limit:   5000,
    transform(row) {
      const text    = String(row.text  ?? '').trim();
      const labelId = Number(row.label ?? -1);
      const label   = DAIR_LABEL[labelId];
      if (!text || !label || text.length < 8) return null;
      return JSON.stringify({ text, label });
    },
  },
];

// ── Read parquet via HF CDN → JSONL ─────────────────────────
async function parquetUrlToJsonl(spec: DatasetSpec): Promise<number> {
  console.log(`\n⬇  ${spec.name}`);
  console.log(`   ${spec.url}`);

  const dest = path.join(DATASETS_DIR, spec.jsonlOut);

  // Skip if already done
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) {
    const existing = fs.readFileSync(dest, 'utf-8').split('\n').filter(Boolean).length;
    if (existing >= spec.limit * 0.9) {
      console.log(`   ⏭  Already done (${existing} rows)`);
      return existing;
    }
  }

  const { asyncBufferFromUrl, parquetReadObjects, toJson } = await loadHyparquet();

  console.log(`   Fetching parquet metadata…`);
  const file = await asyncBufferFromUrl({ url: spec.url });

  console.log(`   Parsing rows (limit ${spec.limit})…`);
  const allRows = await parquetReadObjects({
    file,
    rowEnd: spec.limit,
  });

  console.log(`   Raw rows: ${allRows.length} — transforming…`);

  const writer = fs.createWriteStream(dest, { flags: 'w' });
  let written = 0;

  for (const rawRow of allRows) {
    // toJson converts BigInt / Date / typed arrays to plain JSON-safe values
    const row = toJson(rawRow) as Record<string, unknown>;
    const line = spec.transform(row);
    if (line) { writer.write(line + '\n'); written++; }
  }

  await new Promise<void>((res, rej) => writer.end((e: Error | null) => e ? rej(e) : res()));
  console.log(`   ✓ ${written} rows → ${path.relative(process.cwd(), dest)}`);
  return written;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Harmony — HuggingFace Dataset Downloader              ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  fs.mkdirSync(DATASETS_DIR, { recursive: true });

  // Report GoEmotions status
  const goPath = path.join(DATASETS_DIR, 'go_emotions.jsonl');
  if (fs.existsSync(goPath)) {
    const n = fs.readFileSync(goPath, 'utf-8').split('\n').filter(Boolean).length;
    console.log(`\n✓ GoEmotions ready (${n} rows)`);
  } else {
    console.warn('\n⚠  go_emotions.jsonl missing — download it first via npm run rag:download');
  }

  let ok = 0; let fail = 0;
  for (const spec of SPECS) {
    try {
      await parquetUrlToJsonl(spec);
      ok++;
    } catch (err) {
      console.error(`\n✗ Failed ${spec.name}: ${err}`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  Completed: ${ok}   Failed: ${fail}`);
  if (fail === 0) {
    console.log('\n✓ All datasets ready! Next steps:');
    console.log('  npm run rag:chunk    ← chunk into RAG pieces');
    console.log('  npm run rag:lexicon  ← build emotion lexicon from GoEmotions');
    console.log('  npm run rag:embed    ← embed into pgvector');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
