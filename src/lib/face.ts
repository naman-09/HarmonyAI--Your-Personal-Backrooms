'use client';

// Face-api.js is loaded lazily so it doesn't SSR
let faceapi: typeof import('face-api.js') | null = null;
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export interface FaceEmotions {
  // Raw expression scores from the neural net
  angry:     number;
  sad:       number;
  neutral:   number;
  happy:     number;
  surprised: number;
  disgusted: number;
  fearful:   number;
  // Geometric signals from 68-point landmarks
  eyeOpenness: number;  // 0–1: high = wide eyes (fear/surprise)
  browRaise:   number;  // 0–1: high = raised brows (concern/surprise)
  mouthOpen:   number;  // 0–1: high = open mouth (distress/surprise)
  available:   boolean;
}

const NULL_RESULT: FaceEmotions = {
  angry: 0, sad: 0, neutral: 1, happy: 0,
  surprised: 0, disgusted: 0, fearful: 0,
  eyeOpenness: 0, browRaise: 0, mouthOpen: 0,
  available: false,
};

// ─── Model loading ────────────────────────────────────────────
// Models served from /public/models/ (downloaded from face-api.js weights)
// Required:
//   tiny_face_detector_model-*          (189 KB)
//   face_expression_model-*             (322 KB)
//   face_landmark_68_tiny_model-*       (76  KB)
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
      ]);
      modelsLoaded = true;
      console.log('[face.ts] Models loaded: detector + expressions + landmarks');
    } catch (err) {
      console.warn('[face.ts] Model loading failed — face signals unavailable:', err);
    }
  })();

  return loadPromise;
}

// ─── Geometric helpers (68-point landmark indices) ───────────
//  Left eye:     36–41  (36=outer, 39=inner, 37-38=top, 40-41=bottom)
//  Right eye:    42–47  (42=outer, 45=inner, 43-44=top, 46-47=bottom)
//  Left brow:    17–21  (centre ~19)
//  Right brow:   22–26  (centre ~24)
//  Nose tip:     33
//  Mouth:        48–67  (48=left corner, 54=right corner,
//                         51=upper lip top, 57=lower lip bottom,
//                         62=inner upper, 66=inner lower)

type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function extractLandmarkSignals(pts: Pt[]): Pick<FaceEmotions, 'eyeOpenness' | 'browRaise' | 'mouthOpen'> {
  // Eye openness: vertical span / horizontal span for each eye
  // Left eye vertical: avg(37,38) top  →  avg(40,41) bottom
  const leftEyeH  = dist(pts[37], pts[41]) / 2 + dist(pts[38], pts[40]) / 2; // vertical
  const leftEyeW  = dist(pts[36], pts[39]);    // horizontal span
  // Right eye
  const rightEyeH = dist(pts[43], pts[47]) / 2 + dist(pts[44], pts[46]) / 2;
  const rightEyeW = dist(pts[42], pts[45]);
  // Ratio ~0.28 closed, ~0.45 normal, ~0.65+ wide-open
  const leftRatio  = leftEyeW  > 0 ? leftEyeH  / leftEyeW  : 0;
  const rightRatio = rightEyeW > 0 ? rightEyeH / rightEyeW : 0;
  const rawEye = (leftRatio + rightRatio) / 2;
  // Normalise: 0.28 → 0, 0.65 → 1
  const eyeOpenness = clamp01((rawEye - 0.28) / 0.37);

  // Brow raise: distance from brow mid-point to eye mid-point, normalised by face height
  const faceHeight = dist(pts[27], pts[8]) || 1; // nose bridge to chin
  const leftBrowMid  = pts[19]; // centre of left brow
  const rightBrowMid = pts[24];
  const leftEyeTop   = { x: (pts[37].x + pts[38].x) / 2, y: (pts[37].y + pts[38].y) / 2 };
  const rightEyeTop  = { x: (pts[43].x + pts[44].x) / 2, y: (pts[43].y + pts[44].y) / 2 };
  const browEyeDist  = (dist(leftBrowMid, leftEyeTop) + dist(rightBrowMid, rightEyeTop)) / 2;
  // Typically 0.10–0.22 of face height; low = furrowed, high = raised
  const rawBrow = browEyeDist / faceHeight;
  const browRaise = clamp01((rawBrow - 0.10) / 0.14);

  // Mouth open: inner vertical / horizontal
  const mouthV = dist(pts[62], pts[66]); // inner top to inner bottom
  const mouthW = dist(pts[48], pts[54]); // corner to corner
  const rawMouth = mouthW > 0 ? mouthV / mouthW : 0;
  // 0 = closed, 0.5+ = clearly open
  const mouthOpen = clamp01(rawMouth / 0.5);

  return { eyeOpenness, browRaise, mouthOpen };
}

// ─── Emotion detection ────────────────────────────────────────
export async function detectEmotions(
  videoEl: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceEmotions> {
  if (!modelsLoaded || !faceapi) return NULL_RESULT;

  try {
    const result = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)   // true = use tiny landmark model (faster)
      .withFaceExpressions();

    if (!result) return NULL_RESULT;

    const geo = extractLandmarkSignals(result.landmarks.positions as Pt[]);

    return {
      angry:     result.expressions.angry,
      sad:       result.expressions.sad,
      neutral:   result.expressions.neutral,
      happy:     result.expressions.happy,
      surprised: result.expressions.surprised,
      disgusted: result.expressions.disgusted,
      fearful:   result.expressions.fearful,
      ...geo,
      available: true,
    };
  } catch {
    return NULL_RESULT;
  }
}
