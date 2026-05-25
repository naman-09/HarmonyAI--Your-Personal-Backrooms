/**
 * Build an emotion-word lexicon from GoEmotions data.
 *
 * Reads  scripts/datasets/go_emotions.jsonl
 * Writes src/lib/emotion-lexicon.json
 *
 * Format: { word: { anger: 0–1, sadness: 0–1, fear: 0–1, distress: 0–1, joy: 0–1 } }
 * Only words with strong signal (distress or joy > 0.15) are kept.
 * Top 2,000 words by signal strength are exported (keeps bundle size tiny).
 *
 * Usage: npx dotenv -e .env.local -- tsx scripts/build-emotion-lexicon.ts
 */

import fs   from 'fs';
import path from 'path';

const GO_EMOTIONS_FILE = path.resolve(__dirname, 'datasets', 'go_emotions.jsonl');
const OUTPUT_FILE      = path.resolve(__dirname, '../src/lib/emotion-lexicon.json');

// ── GoEmotions label map ─────────────────────────────────────
const LABEL_NAMES: Record<number, string> = {
  0:'admiration',1:'amusement',2:'anger',3:'annoyance',4:'approval',
  5:'caring',6:'confusion',7:'curiosity',8:'desire',9:'disappointment',
  10:'disapproval',11:'disgust',12:'embarrassment',13:'excitement',14:'fear',
  15:'gratitude',16:'grief',17:'joy',18:'love',19:'nervousness',
  20:'optimism',21:'pride',22:'realization',23:'relief',24:'remorse',
  25:'sadness',26:'surprise',27:'neutral',
};

// Emotions mapped to our distress/joy axes for scoring
const DISTRESS_EMOTIONS = new Set([
  'anger','annoyance','disappointment','disapproval','disgust',
  'embarrassment','fear','grief','nervousness','remorse','sadness',
]);
const JOY_EMOTIONS = new Set([
  'admiration','amusement','approval','caring','excitement',
  'gratitude','joy','love','optimism','pride','relief',
]);

// Stopwords to skip
const STOPWORDS = new Set([
  'the','a','an','is','it','to','of','and','or','in','on','at','for',
  'that','this','was','with','have','had','has','he','she','they','we',
  'i','you','me','my','your','their','our','be','are','do','did','will',
  'not','but','so','if','as','by','from','about','up','out','just','like',
  'what','when','who','how','all','its','can','could','would','should',
  'more','been','were','than','then','there','some','one','no','his',
  'her','which','they','them','into','over','after','before','about',
]);

interface WordAccum {
  distress:  number;   // sum of distress-emotion co-occurrences
  joy:       number;   // sum of joy-emotion co-occurrences
  anger:     number;
  sadness:   number;
  fear:      number;
  total:     number;   // total appearances
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('═══ Harmony — Emotion Lexicon Builder ═══\n');

  if (!fs.existsSync(GO_EMOTIONS_FILE)) {
    console.error(`✗ ${GO_EMOTIONS_FILE} not found.`);
    console.error('  Run: npx tsx scripts/download-hf-datasets.ts first.');
    process.exit(1);
  }

  const lines = fs.readFileSync(GO_EMOTIONS_FILE, 'utf-8').split('\n').filter(Boolean);
  console.log(`Loaded ${lines.length} GoEmotions samples`);

  const wordMap = new Map<string, WordAccum>();

  for (const line of lines) {
    let row: { text?: string; labels?: number[] };
    try { row = JSON.parse(line); } catch { continue; }

    const text   = (row.text || '').toLowerCase();
    const labels = (row.labels || []).map(Number);
    if (!text || labels.length === 0) continue;

    const labelNames = labels.map((l) => LABEL_NAMES[l] || 'neutral');

    // Per-text scores
    let distressScore = 0, joyScore = 0, angerScore = 0, sadScore = 0, fearScore = 0;
    for (const lbl of labelNames) {
      if (DISTRESS_EMOTIONS.has(lbl)) distressScore += 1;
      if (JOY_EMOTIONS.has(lbl))     joyScore       += 1;
      if (lbl === 'anger' || lbl === 'annoyance' || lbl === 'disgust') angerScore += 1;
      if (lbl === 'sadness' || lbl === 'grief' || lbl === 'remorse')   sadScore   += 1;
      if (lbl === 'fear' || lbl === 'nervousness')                      fearScore  += 1;
    }
    // Normalise to 0–1 per label slot
    const dNorm = Math.min(distressScore / 2, 1);
    const jNorm = Math.min(joyScore      / 2, 1);
    const aNorm = Math.min(angerScore    / 1, 1);
    const sNorm = Math.min(sadScore      / 1, 1);
    const fNorm = Math.min(fearScore     / 1, 1);

    // Tokenise text
    const words = text.match(/\b[a-z]{3,15}\b/g) || [];
    for (const w of words) {
      if (STOPWORDS.has(w)) continue;
      if (!wordMap.has(w)) wordMap.set(w, { distress: 0, joy: 0, anger: 0, sadness: 0, fear: 0, total: 0 });
      const acc = wordMap.get(w)!;
      acc.distress += dNorm;
      acc.joy      += jNorm;
      acc.anger    += aNorm;
      acc.sadness  += sNorm;
      acc.fear     += fNorm;
      acc.total    += 1;
    }
  }

  console.log(`Accumulated ${wordMap.size} unique words`);

  // ── Compute per-word normalised scores ───────────────────────
  // Conditional probability: P(distress | word) = distressCount / total
  type LexiconEntry = { distress: number; joy: number; anger: number; sadness: number; fear: number };
  const lexicon: Record<string, LexiconEntry> = {};

  for (const [word, acc] of wordMap) {
    if (acc.total < 3) continue;   // need at least 3 occurrences for reliability

    const d = acc.distress / acc.total;
    const j = acc.joy      / acc.total;
    const a = acc.anger    / acc.total;
    const s = acc.sadness  / acc.total;
    const f = acc.fear     / acc.total;

    // Only keep words with meaningful signal
    const maxSignal = Math.max(d, j);
    if (maxSignal < 0.12) continue;

    lexicon[word] = {
      distress: +d.toFixed(3),
      joy:      +j.toFixed(3),
      anger:    +a.toFixed(3),
      sadness:  +s.toFixed(3),
      fear:     +f.toFixed(3),
    };
  }

  console.log(`Signal words: ${Object.keys(lexicon).length}`);

  // ── Keep top 2,500 by max signal (trim file size) ───────────
  const sorted = Object.entries(lexicon)
    .sort(([, a], [, b]) => Math.max(b.distress, b.joy) - Math.max(a.distress, a.joy))
    .slice(0, 2500);
  const trimmed = Object.fromEntries(sorted);

  // ── Write ────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trimmed, null, 0));
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);

  console.log(`\n✓ Written to src/lib/emotion-lexicon.json`);
  console.log(`  Words: ${Object.keys(trimmed).length} | Size: ${sizeKB} KB`);

  // ── Print top distress / joy words for inspection ───────────
  const topDistress = sorted
    .filter(([, v]) => v.distress > v.joy)
    .slice(0, 15)
    .map(([w, v]) => `${w}(${v.distress.toFixed(2)})`);
  const topJoy = sorted
    .filter(([, v]) => v.joy >= v.distress)
    .slice(0, 15)
    .map(([w, v]) => `${w}(${v.joy.toFixed(2)})`);

  console.log('\nTop distress words:', topDistress.join(' '));
  console.log('Top joy words:     ', topJoy.join(' '));
}

main().catch((err) => { console.error(err); process.exit(1); });
