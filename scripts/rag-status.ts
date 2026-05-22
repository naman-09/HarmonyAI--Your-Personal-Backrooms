/**
 * Phase A5 — RAG status checker
 *
 * Quick health check for the RAG pipeline:
 *   - pgvector extension
 *   - rag_chunks table
 *   - embedding count by source
 *   - test retrieval query
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/rag-status.ts
 */

import { neon } from '@neondatabase/serverless';

const OLLAMA_URL  = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

async function main() {
  console.log('=== Harmony RAG — Status Check ===\n');

  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);

  // 1. Check pgvector extension
  try {
    const ext = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
    if (ext.length > 0) {
      console.log('✓ pgvector extension installed');
    } else {
      console.log('✗ pgvector extension NOT installed');
      console.log('  Run: CREATE EXTENSION vector;');
    }
  } catch (err) {
    console.log('✗ Could not check pgvector:', err);
  }

  // 2. Check rag_chunks table
  try {
    const count = await sql`SELECT COUNT(*) as total FROM rag_chunks`;
    const total = Number(count[0].total);
    console.log(`✓ rag_chunks table exists — ${total} embeddings`);

    if (total > 0) {
      // Breakdown by source
      const sources = await sql`
        SELECT source, COUNT(*) as count
        FROM rag_chunks
        GROUP BY source
        ORDER BY count DESC
      `;
      for (const s of sources) {
        console.log(`  └─ ${s.source}: ${s.count}`);
      }
    }
  } catch {
    console.log('✗ rag_chunks table does not exist');
    console.log('  Run: npx dotenv -e .env.local -- tsx scripts/embed-documents.ts');
  }

  // 3. Check Ollama embedding model
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (res.ok) {
      const data = await res.json();
      const models = data.models?.map((m: any) => m.name) || [];
      const hasEmbed = models.some((m: string) => m.includes('nomic-embed'));
      console.log(`✓ Ollama reachable at ${OLLAMA_URL}`);
      console.log(`  ${hasEmbed ? '✓' : '✗'} ${EMBED_MODEL} ${hasEmbed ? 'available' : 'NOT found — run: ollama pull nomic-embed-text'}`);
    }
  } catch {
    console.log(`✗ Ollama unreachable at ${OLLAMA_URL}`);
  }

  // 4. Test retrieval
  try {
    const testRes = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: 'I feel anxious about my exam' }),
    });

    if (testRes.ok) {
      const data = await testRes.json();
      const embStr = `[${data.embedding.join(',')}]`;

      const results = await sql`
        SELECT content, source, 1 - (embedding <=> ${embStr}::vector) AS similarity
        FROM rag_chunks
        ORDER BY embedding <=> ${embStr}::vector
        LIMIT 3
      `;

      if (results.length > 0) {
        console.log('\n✓ Test retrieval for "I feel anxious about my exam":');
        for (const r of results) {
          const preview = r.content.slice(0, 100).replace(/\n/g, ' ');
          console.log(`  [${Number(r.similarity).toFixed(3)}] ${r.source}: ${preview}...`);
        }
      } else {
        console.log('\nℹ No results for test query — table may be empty');
      }
    }
  } catch {
    console.log('\nℹ Could not run test retrieval');
  }

  console.log('\n=== Status check complete ===');
}

main().catch((err) => { console.error(err); process.exit(1); });
