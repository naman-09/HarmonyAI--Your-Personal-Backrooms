from typing import Literal

from pydantic import BaseModel, Field


class EmotionSignals(BaseModel):
    voicePitch: float = Field(ge=0)
    voiceVolume: float = Field(ge=0, le=100)
    textSentiment: float = Field(ge=0, le=1)
    faceAnger: float = Field(default=0, ge=0, le=1)
    faceSad: float = Field(default=0, ge=0, le=1)
    faceHappy: float = Field(default=0, ge=0, le=1)
    faceSurprised: float = Field(default=0, ge=0, le=1)
    faceDisgusted: float = Field(default=0, ge=0, le=1)
    faceFearful: float = Field(default=0, ge=0, le=1)
    faceNeutral: float = Field(default=1, ge=0, le=1)
    eyeOpenness: float = Field(default=0, ge=0, le=1)
    browRaise: float = Field(default=0, ge=0, le=1)
    mouthOpen: float = Field(default=0, ge=0, le=1)
    faceAvailable: bool = False


class EmotionScore(BaseModel):
    rage: float = Field(ge=0, le=1)
    calm: float = Field(ge=0, le=1)
    label: Literal["calm", "unsettled", "distressed", "intense"]
    displayValue: int = Field(ge=1, le=10)


class SafetyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class SafetyResponse(BaseModel):
    level: int = Field(ge=0, le=4)
    triggers: list[str]
    response: str | None = None
