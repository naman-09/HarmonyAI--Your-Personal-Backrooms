import re

from .schemas import EmotionScore, EmotionSignals, SafetyResponse

MAX_PITCH = 400
MAX_VOLUME = 90


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def score_emotion(signals: EmotionSignals) -> EmotionScore:
    voice_stress = clamp(signals.voicePitch / MAX_PITCH, 0, 1)
    voice_volume = clamp(signals.voiceVolume / MAX_VOLUME, 0, 1)
    text_score = clamp(signals.textSentiment, 0, 1)

    face_distress = clamp(
        signals.faceAnger * 0.35
        + signals.faceSad * 0.25
        + signals.faceFearful * 0.20
        + signals.faceDisgusted * 0.10
        + signals.faceSurprised * 0.05
        + signals.eyeOpenness * 0.15
        + signals.browRaise * 0.10
        + signals.mouthOpen * 0.05
        - signals.faceHappy * 0.30,
        0,
        1,
    )

    if signals.faceAvailable:
        rage = (
            text_score * 0.40
            + face_distress * 0.35
            + voice_stress * 0.13
            + voice_volume * 0.12
        )
    else:
        rage = text_score * 0.70 + voice_stress * 0.15 + voice_volume * 0.15

    rage = clamp(rage, 0, 1)
    calm = 1 - rage
    display_value = round(rage * 9 + 1)

    if rage < 0.25:
        label = "calm"
    elif rage < 0.50:
        label = "unsettled"
    elif rage < 0.75:
        label = "distressed"
    else:
        label = "intense"

    return EmotionScore(
        rage=rage,
        calm=calm,
        label=label,
        displayValue=display_value,
    )


LEVEL_3_PATTERNS = [
    r"\b(kill|end|take)\s+(my)?\s*life\b",
    r"\b(want|thinking|planning)\s+to\s+(die|hurt\s+myself|end\s+it)\b",
    r"\bsuicid(e|al|ally)\b",
    r"\bself[- ]harm(ing)?\b",
    r"\bcut(ting)?\s+myself\b",
    r"\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\s+anymore\b",
    r"\b(overdose|od'?ing)\b",
    r"\b(hang|shoot|jump)\s+(myself|off|from)\b",
]

LEVEL_2_PATTERNS = [
    r"\bcan'?t\s+(go\s+on|take\s+it|do\s+this\s+anymore|hold\s+on)\b",
    r"\bbreaking\s+down\b",
    r"\bgiving\s+up\b",
    r"\bno\s+(reason|point)\s+to\s+(live|continue|keep\s+going)\b",
    r"\beveryone\s+(would|will)\s+be\s+better\s+without\s+me\b",
    r"\b(losing|lost)\s+(the\s+)?will\s+to\s+(live|go\s+on)\b",
    r"\bfall(ing)?\s+apart\b",
    r"\bcollaps(e|ing)\b",
]

LEVEL_1_PATTERNS = [
    r"\bcan'?t\s+(cope|bear|stand)\b",
    r"\bworthless\b",
    r"\bhopeless\b",
    r"\bexhaust(ed|ion)\b",
    r"\bnumb(ness)?\b",
    r"\bdesperate\b",
    r"\bburning?\s*out\b",
    r"\bso\s+alone\b",
    r"\bno\s+one\s+(cares|understands)\b",
]

CRISIS_RESPONSE = (
    "I'm really glad you reached out, and I want you to know that what you're "
    "feeling matters deeply.\n\n"
    "Please talk to someone right now: iCall (TISS) 9152987821, "
    "Vandrevala Foundation 1860-2662-345, or Emergency 112."
)


def match_patterns(text: str, patterns: list[str]) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text, re.IGNORECASE)]


def check_safety(text: str) -> SafetyResponse:
    level_3 = match_patterns(text, LEVEL_3_PATTERNS)
    if level_3:
        return SafetyResponse(level=3, triggers=level_3, response=CRISIS_RESPONSE)

    level_2 = match_patterns(text, LEVEL_2_PATTERNS)
    if level_2:
        return SafetyResponse(level=2, triggers=level_2)

    level_1 = match_patterns(text, LEVEL_1_PATTERNS)
    if level_1:
        return SafetyResponse(level=1, triggers=level_1)

    return SafetyResponse(level=0, triggers=[])
