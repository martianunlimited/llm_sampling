"""Unit tests for Sampling Pydantic v2 schemas."""

import pytest
from pydantic import ValidationError

from src.schemas import (
    BeamHypothesis,
    SamplingParameters,
    SamplingPreset,
    TokenCandidate,
)


def test_token_candidate_schema() -> None:
    c = TokenCandidate(
        token="Paris",
        raw_logit=14.2,
        penalized_logit=14.2,
        raw_prob=0.85,
        filtered=False,
        final_prob=0.85,
        cumulative_prob=0.85,
    )
    assert c.token == "Paris"
    assert c.raw_logit == 14.2
    assert not c.filtered


def test_sampling_parameters_validation() -> None:
    params = SamplingParameters(temperature=0.7, top_k=5, top_p=0.95, repetition_penalty=1.1)
    assert params.temperature == 0.7
    assert params.top_k == 5
    assert params.top_p == 0.95

    # Out of range temperature
    with pytest.raises(ValidationError):
        SamplingParameters(temperature=-0.5)

    # Out of range top_p
    with pytest.raises(ValidationError):
        SamplingParameters(top_p=1.5)


def test_beam_hypothesis_schema() -> None:
    h = BeamHypothesis(
        tokens=["The", "capital", "of", "France", "is", "Paris"],
        text="The capital of France is Paris",
        cumulative_log_prob=-0.42,
        score=-0.07,
    )
    assert len(h.tokens) == 6
    assert h.text.endswith("Paris")
    assert h.score == -0.07


def test_sampling_preset_schema() -> None:
    p = SamplingPreset(
        id="paris-factual",
        title="Factual Recall: Capital of France",
        category="Factual",
        prompt="The capital of France is",
        description="Low entropy factual recall",
        explanation="The model places overwhelmingly high probability on 'Paris'.",
        recommended_temp=0.1,
        recommended_top_k=5,
        recommended_top_p=0.90,
        recommended_rep_pen=1.0,
        candidates={"Paris": 14.2, "Lyon": 6.1, "Marseille": 5.8},
    )
    assert p.id == "paris-factual"
    assert "Paris" in p.candidates
    assert p.candidates["Paris"] == 14.2
