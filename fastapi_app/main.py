"""Harmony FastAPI sidecar — emotion scoring + safety checking."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import EmotionScore, EmotionSignals, SafetyRequest, SafetyResponse
from .services import check_safety, score_emotion

app = FastAPI(
    title="Harmony AI Services",
    version="0.2.0",
    description=(
        "Optional Python sidecar for Harmony. "
        "Provides emotion scoring and safety analysis. "
        "The Next.js app falls back to built-in TypeScript implementations "
        "when this service is unavailable."
    ),
)

# Allow the Next.js dev and production origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Global error handler — never expose stack traces to the client ──
@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal service error", "service": "harmony-fastapi"},
    )


# ── Health ──────────────────────────────────────────────────────────
@app.get("/health", summary="Service health check")
def health() -> dict:
    return {
        "status": "ok",
        "service": "harmony-fastapi",
        "version": app.version,
        "endpoints": [
            "POST /api/v1/emotion/score",
            "POST /api/v1/safety/check",
        ],
    }


# ── Emotion scoring ─────────────────────────────────────────────────
@app.post(
    "/api/v1/emotion/score",
    response_model=EmotionScore,
    summary="Score emotional state from multimodal signals",
)
def emotion_score(signals: EmotionSignals) -> EmotionScore:
    """
    Compute a composite emotion score from voice, text-sentiment, and
    optional face-expression signals.

    Falls back to text+voice only when `faceAvailable` is false.
    """
    return score_emotion(signals)


# ── Safety check ────────────────────────────────────────────────────
@app.post(
    "/api/v1/safety/check",
    response_model=SafetyResponse,
    summary="Pattern-match text for crisis / distress signals",
)
def safety_check(payload: SafetyRequest) -> SafetyResponse:
    """
    Scan user text for crisis/distress patterns.
    Returns a level 0-3 risk assessment with matched triggers.

    Level 0 = clear
    Level 1 = mild distress (coping difficulty, exhaustion)
    Level 2 = moderate distress (giving up, falling apart)
    Level 3 = crisis (suicidal ideation, self-harm)
    """
    return check_safety(payload.text)
