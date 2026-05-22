'use client';

// Face-api.js is loaded lazily so it doesn't SSR
let faceapi: typeof import('face-api.js') | null = null;
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export interface FaceEmotions {
  angry:     number;
  sad:       number;
  neutral:   number;
  happy:     number;
  available: boolean; // false if camera off, models failed, or no face detected
}

const NULL_RESULT: FaceEmotions = {
  angry: 0, sad: 0, neutral: 1, happy: 0, available: false,
};

// ─── Model loading ────────────────────────────────────────────
// Models must be served from /public/models/
// Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
// Required files:
//   tiny_face_detector_model-weights_manifest.json + shard
//   face_expression_recognition_model-weights_manifest.json + shard
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      ]);
      modelsLoaded = true;
    } catch (err) {
      console.warn('[face.ts] Model loading failed — face signals unavailable:', err);
      // App continues without face signals — graceful degradation
    }
  })();

  return loadPromise;
}

// ─── Emotion detection ────────────────────────────────────────
export async function detectEmotions(
  videoEl: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceEmotions> {
  if (!modelsLoaded || !faceapi) return NULL_RESULT;

  try {
    const result = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!result) return NULL_RESULT;

    return {
      angry:     result.expressions.angry,
      sad:       result.expressions.sad,
      neutral:   result.expressions.neutral,
      happy:     result.expressions.happy,
      available: true,
    };
  } catch {
    return NULL_RESULT;
  }
}
