#!/usr/bin/env bash
# Downloads required face-api.js model weights into public/models/
# Run once after cloning: bash scripts/download-models.sh

set -e

BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
DEST="$(dirname "$0")/../public/models"

mkdir -p "$DEST"

FILES=(
  "tiny_face_detector_model-shard1"
  "tiny_face_detector_model-weights_manifest.json"
  "face_expression_recognition_model-shard1"
  "face_expression_recognition_model-weights_manifest.json"
)

echo "Downloading face-api.js model weights…"
for f in "${FILES[@]}"; do
  echo "  → $f"
  curl -sSL "$BASE/$f" -o "$DEST/$f"
done

echo "Done. Models saved to public/models/"
