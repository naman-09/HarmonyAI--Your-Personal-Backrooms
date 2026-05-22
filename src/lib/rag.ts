/**
 * Phase A4 — RAG retrieval function
 *
 * Embeds the user query via Ollama nomic-embed-text, then runs
 * cosine similarity search against rag_chunks in Neon pgvector.
 */

import { neon } from '@neondatabase/serverless';

const OLLAMA_URL  = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const TOP_K       = 3;       // number of relevant chunks to retrieve
const MIN_SCORE   = 0.65;    // minimum cosine similarity (1 = identical)

export interface RAGResult {
  content:  string;
  source:   string;
  score:    number;
  metadata: Record<string, any>;
}

// ─── Embed query ─────────────────────────────────────────────
async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      signal:  AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.embedding;
  } catch {
    console.warn('[rag] Embedding request failed — RAG unavailable this turn');
    return null;
  }
}

// ─── Retrieve relevant chunks ────────────────────────────────
export async function retrieveContext(
  query: string,
  topK: number = TOP_K
): Promise<RAGResult[]> {
  if (!process.env.DATABASE_URL) return [];

  const embedding = await embedQuery(query);
  if (!embedding) return [];

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const embStr = `[${embedding.join(',')}]`;

    // Cosine distance: smaller = more similar
    // 1 - cosine_distance = cosine_similarity
    const rows = await sql`
      SELECT
        content,
        source,
        metadata,
        1 - (embedding <=> ${embStr}::vector) AS similarity
      FROM rag_chunks
      WHERE 1 - (embedding <=> ${embStr}::vector) > ${MIN_SCORE}
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT ${topK}
    `;

    return rows.map((r: any) => ({
      content:  r.content,
      source:   r.source,
      score:    Number(r.similarity),
      metadata: r.metadata || {},
    }));
  } catch (err) {
    console.warn('[rag] Retrieval failed:', err);
    return [];
  }
}

// ─── Format context for the LLM ─────────────────────────────
export function formatRAGContext(results: RAGResult[]): string {
  if (results.length === 0) return '';

  const sections = results.map((r, i) => {
    const srcLabel =
      r.source === 'empathetic_dialogues' ? 'Empathetic Dialogue' :
      r.source === 'counsel_chat'         ? 'Counselor Response'  :
      r.source === 'mental_health_faq'    ? 'Mental Health FAQ'   :
      r.source;

    return `[${srcLabel}]\n${r.content}`;
  });

  return `\n---\nRelevant knowledge (use naturally, don't quote verbatim):\n${sections.join('\n\n')}\n---`;
}
