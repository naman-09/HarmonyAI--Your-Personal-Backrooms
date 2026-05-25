/**
 * Phase A3 — Embed chunks into pgvector via Ollama nomic-embed-text
 *
 * Reads chunks.jsonl from Phase A2, generates embeddings using Ollama,
 * and stores them in a Neon pgvector table for cosine similarity search.
 *
 * Prerequisites:
 *   1. Run `scripts/download-datasets.ts` and `scripts/chunk-documents.ts` first
 *   2. Ollama must be running with nomic-embed-text pulled:
 *      ollama pull nomic-embed-text
 *   3. Enable pgvector extension in Neon dashboard (or run the SQL below)
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/embed-documents.ts
 */

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const CHUNKS_FILE  = path.resolve(__dirname, 'datasets', 'chunks.jsonl');
const OLLAMA_URL   = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBED_MODEL  = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const BATCH_SIZE   = 10;     // chunks per batch
const EMBED_DIM    = 768;    // nomic-embed-text dimension
const MAX_RETRIES  = 3;

interface Chunk {
  text:   string;
  source: string;
  meta:   Record<string, any>;
}

// ─── DB setup ────────────────────────────────────────────────
async function setupTable(sql_fn: any) {
  console.log('Setting up pgvector extension and table...');

  // Use raw string calls for DDL — Neon's template literal parameterises
  // ${} interpolations which breaks DDL (e.g. vector($1) is invalid SQL)
  await sql_fn('CREATE EXTENSION IF NOT EXISTS vector');

  await sql_fn(
    `CREATE TABLE IF NOT EXISTS rag_chunks (
       id         SERIAL PRIMARY KEY,
       content    TEXT NOT NULL,
       source     TEXT NOT NULL,
       metadata   JSONB DEFAULT '{}',
       embedding  vector(${EMBED_DIM}) NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`
  );

  await sql_fn(
    `CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
     ON rag_chunks
     USING hnsw (embedding vector_cosine_ops)`
  );

  console.log('   ✓ Table rag_chunks ready with HNSW index');
}

// ─── Embedding via Ollama ────────────────────────────────────
async function getEmbedding(text: string, retries = MAX_RETRIES): Promise<number[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama ${res.status}: ${body}`);
      }

      const data = await res.json();
      return data.embedding;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`   ⚠  Retry ${attempt + 1}/${retries} — ${err}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unreachable');
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== Harmony RAG — Embedding Pipeline ===\n');

  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL not set. Run with: npx dotenv -e .env.local -- tsx scripts/embed-documents.ts');
    process.exit(1);
  }

  if (!fs.existsSync(CHUNKS_FILE)) {
    console.error(`✗ ${CHUNKS_FILE} not found. Run chunk-documents.ts first.`);
    process.exit(1);
  }

  // Verify Ollama is reachable
  try {
    const check = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!check.ok) throw new Error(`HTTP ${check.status}`);
    console.log(`✓ Ollama reachable at ${OLLAMA_URL}`);
  } catch {
    console.error(`✗ Cannot reach Ollama at ${OLLAMA_URL}. Is it running?`);
    process.exit(1);
  }

  // Read chunks
  const lines = fs.readFileSync(CHUNKS_FILE, 'utf-8').split('\n').filter(Boolean);
  const chunks: Chunk[] = lines.map((l) => JSON.parse(l));
  console.log(`Loaded ${chunks.length} chunks from ${path.relative(process.cwd(), CHUNKS_FILE)}`);

  // Setup DB
  const sql_fn = neon(process.env.DATABASE_URL!);
  await setupTable(sql_fn);

  // Check how many are already embedded
  const existing = await sql_fn`SELECT COUNT(*) as count FROM rag_chunks`;
  const existingCount = Number(existing[0].count);
  if (existingCount > 0) {
    console.log(`\nℹ  Found ${existingCount} existing embeddings in DB`);
    console.log(`   To re-embed, run: DROP TABLE rag_chunks; then re-run this script`);

    // Skip if already has substantial data
    if (existingCount >= chunks.length * 0.9) {
      console.log('   Already fully embedded — skipping.');
      return;
    }
  }

  // Truncate if partially done (simpler than tracking individual chunks)
  if (existingCount > 0 && existingCount < chunks.length * 0.9) {
    console.log('   Partial embed detected — truncating and re-embedding...');
    await sql_fn`TRUNCATE rag_chunks RESTART IDENTITY`;
  }

  // Process in batches
  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    for (const chunk of batch) {
      try {
        const embedding = await getEmbedding(chunk.text);

        if (embedding.length !== EMBED_DIM) {
          console.warn(`   ⚠  Unexpected dim ${embedding.length} for chunk — skipping`);
          errors++;
          continue;
        }

        const embStr = `[${embedding.join(',')}]`;

        await sql_fn`
          INSERT INTO rag_chunks (content, source, metadata, embedding)
          VALUES (${chunk.text}, ${chunk.source}, ${JSON.stringify(chunk.meta)}, ${embStr}::vector)
        `;

        processed++;
      } catch (err) {
        errors++;
        console.warn(`   ✗ Failed chunk ${i}: ${err}`);
      }
    }

    // Progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = (chunks.length - i - batch.length) / rate;
    process.stdout.write(
      `\r   ${processed}/${chunks.length} embedded (${rate.toFixed(1)}/s, ~${Math.ceil(remaining)}s remaining)   `
    );
  }

  console.log('\n');

  // Final count
  const finalCount = await sql_fn`SELECT COUNT(*) as count FROM rag_chunks`;
  console.log(`\n=== Done ===`);
  console.log(`  Embedded: ${processed}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  DB total: ${finalCount[0].count}`);
  console.log(`  Time:     ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
