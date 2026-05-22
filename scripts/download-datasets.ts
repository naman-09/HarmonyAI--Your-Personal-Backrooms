/**
 * Phase A1 — Download mental health datasets from HuggingFace
 *
 * Datasets:
 *   1. EmpatheticDialogues  — empathetic conversation pairs
 *   2. Counsel Chat         — real therapist Q&A
 *   3. ESConv               — emotional support conversations
 *   4. Mental Health FAQ    — curated FAQ
 *
 * Usage:  npx dotenv -e .env.local -- tsx scripts/download-datasets.ts
 */

import fs from 'fs';
import path from 'path';

const DATASETS_DIR = path.resolve(__dirname, 'datasets');

interface DatasetConfig {
  name: string;
  url: string;
  filename: string;
}

const DATASETS: DatasetConfig[] = [
  {
    name: 'EmpatheticDialogues',
    url: 'https://huggingface.co/datasets/empathetic_dialogues/resolve/main/data/train.csv',
    filename: 'empathetic_dialogues.csv',
  },
  {
    name: 'Counsel Chat',
    url: 'https://huggingface.co/datasets/nbertagnolli/counsel-chat/resolve/main/data/train-00000-of-00001-da8cddd6b50a7769.parquet',
    filename: 'counsel_chat.parquet',
  },
  {
    name: 'Mental Health FAQ',
    url: 'https://huggingface.co/datasets/heliosbrahma/mental_health_chatbot_dataset/resolve/main/data/train-00000-of-00001-b1a5e0f77efdc357.parquet',
    filename: 'mental_health_faq.parquet',
  },
];

async function downloadFile(url: string, dest: string, name: string): Promise<void> {
  console.log(`\n⬇  Downloading ${name}...`);
  console.log(`   URL: ${url}`);

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${name}: ${res.statusText}`);

  const totalBytes = Number(res.headers.get('content-length') || 0);
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;

    if (totalBytes > 0) {
      const pct = ((received / totalBytes) * 100).toFixed(1);
      process.stdout.write(`\r   ${pct}% (${(received / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      process.stdout.write(`\r   ${(received / 1024 / 1024).toFixed(1)} MB`);
    }
  }
  console.log();

  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(dest, buffer);
  console.log(`   ✓ Saved to ${path.relative(process.cwd(), dest)} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function main() {
  console.log('=== Harmony RAG — Dataset Downloader ===\n');

  if (!fs.existsSync(DATASETS_DIR)) {
    fs.mkdirSync(DATASETS_DIR, { recursive: true });
    console.log(`Created ${DATASETS_DIR}`);
  }

  let ok = 0;
  let fail = 0;

  for (const ds of DATASETS) {
    const dest = path.join(DATASETS_DIR, ds.filename);

    if (fs.existsSync(dest)) {
      const size = fs.statSync(dest).size;
      if (size > 1024) {
        console.log(`\n⏭  Skipping ${ds.name} — already exists (${(size / 1024 / 1024).toFixed(1)} MB)`);
        ok++;
        continue;
      }
    }

    try {
      await downloadFile(ds.url, dest, ds.name);
      ok++;
    } catch (err) {
      console.error(`   ✗ Failed: ${err}`);
      fail++;
    }
  }

  console.log(`\n=== Done: ${ok} downloaded, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main();
