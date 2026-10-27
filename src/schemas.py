"""Pydantic v2 schemas for LLM Sampling & Decoding Playground."""

from pydantic import BaseModel, Field


class TokenCandidate(BaseModel):
    """Represents a single candidate token and its transformation through sampling filters."""

    token: str
    raw_logit: float
    penalized_logit: float
    raw_prob: float
    filtered: bool = False
    filter_reason: str = ""
    final_prob: float = 0.0
    cumulative_prob: float = 0.0


class SamplingParameters(BaseModel):
    """Hyperparameters controlling next-token sampling and decoding."""

    temperature: float = Field(default=0.8, ge=0.01, le=5.0)
    top_k: int = Field(default=10, ge=0, le=100)
    top_p: float = Field(default=0.90, ge=0.0, le=1.0)
    min_p: float = Field(default=0.0, ge=0.0, le=1.0)
    repetition_penalty: float = Field(default=1.0, ge=1.0, le=5.0)


class DistributionResult(BaseModel):
    """Complete next-token candidate distribution and metadata."""

    prompt: str
    parameters: SamplingParameters
    candidates: list[TokenCandidate]
    entropy: float
    argmax_token: str
    sampled_token: str | None = None
    surviving_tokens_count: int


class BeamHypothesis(BaseModel):
    """A sequence candidate maintained during Beam Search."""

    tokens: list[str]
    text: str
    cumulative_log_prob: float
    score: float  # Normalized log-probability length penalty


class SamplingPreset(BaseModel):
    """Educational scenario demonstrating a decoding challenge or phenomenon."""

    id: str
    title: str
    category: str
    prompt: str
    description: str
    explanation: str
    recommended_temp: float = 0.8
    recommended_top_k: int = 10
    recommended_top_p: float = 0.90
    recommended_rep_pen: float = 1.0
    candidates: dict[str, float] = Field(default_factory=dict)
    continuations: dict[str, dict[str, float]] = Field(default_factory=dict)
