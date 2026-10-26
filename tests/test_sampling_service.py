"""Unit tests for SamplingService mathematical filtering and decoding."""

import math

from src.core.sampling_service import (
    SamplingService,
    apply_min_p_filter,
    apply_repetition_penalty,
    apply_top_k_filter,
    apply_top_p_filter,
    compute_entropy,
    compute_softmax,
    renormalize,
)
from src.schemas import SamplingParameters


def test_compute_softmax_temperature() -> None:
    logits = {"A": 10.0, "B": 5.0, "C": 0.0}

    # Standard temperature
    probs_t1 = compute_softmax(logits, temperature=1.0)
    assert math.isclose(sum(probs_t1.values()), 1.0, rel_tol=1e-5)
    assert probs_t1["A"] > probs_t1["B"] > probs_t1["C"]

    # Cold temperature (sharpening towards argmax)
    probs_cold = compute_softmax(logits, temperature=0.1)
    assert math.isclose(probs_cold["A"], 1.0, abs_tol=0.01)

    # Hot temperature (entropy flattening)
    probs_hot = compute_softmax(logits, temperature=5.0)
    assert probs_hot["A"] < probs_t1["A"]
    assert probs_hot["C"] > probs_t1["C"]


def test_top_k_filter() -> None:
    probs = {"A": 0.60, "B": 0.25, "C": 0.10, "D": 0.04, "E": 0.01}
    filtered, filtered_out = apply_top_k_filter(probs, k=2)

    assert len(filtered_out) == 3
    assert "C" in filtered_out
    assert "D" in filtered_out
    assert "E" in filtered_out
    assert "A" in filtered
    assert "B" in filtered

    renorm = renormalize(filtered)
    assert math.isclose(sum(renorm.values()), 1.0, rel_tol=1e-5)
    assert renorm["A"] > probs["A"]


def test_top_p_nucleus_filter() -> None:
    # A=0.6, B=0.25 -> cumsum = 0.85
    # C=0.10 -> cumsum = 0.95 (exceeds p=0.90)
    probs = {"A": 0.60, "B": 0.25, "C": 0.10, "D": 0.05}
    filtered, filtered_out = apply_top_p_filter(probs, p=0.90)

    # A, B, C are kept because C is needed to cross 0.90
    assert "A" in filtered
    assert "B" in filtered
    assert "C" in filtered
    assert "D" in filtered_out

    renorm = renormalize(filtered)
    assert math.isclose(sum(renorm.values()), 1.0, rel_tol=1e-5)


def test_min_p_filter() -> None:
    # Top token is A (0.80). min_p = 0.1 means cutoff is 0.1 * 0.80 = 0.08
    probs = {"A": 0.80, "B": 0.12, "C": 0.05, "D": 0.03}
    filtered, filtered_out = apply_min_p_filter(probs, min_p=0.10)

    assert "A" in filtered
    assert "B" in filtered
    assert "C" in filtered_out  # 0.05 < 0.08
    assert "D" in filtered_out  # 0.03 < 0.08


def test_repetition_penalty() -> None:
    logits = {"dog": 5.0, "cat": 4.0, "tree": -2.0}
    context = ["The", "dog", "barked"]

    # Penalty > 1.0 should reduce 'dog' logit
    penalized = apply_repetition_penalty(logits, context, penalty=1.5)

    assert penalized["dog"] < logits["dog"]
    assert math.isclose(penalized["dog"], 5.0 / 1.5, rel_tol=1e-4)
    # 'cat' not in context, unchanged
    assert penalized["cat"] == logits["cat"]


def test_entropy_computation() -> None:
    # Deterministic distribution has 0 entropy
    det = {"A": 1.0, "B": 0.0}
    assert math.isclose(compute_entropy(det), 0.0, abs_tol=1e-6)

    # Uniform distribution has maximum entropy: log2(2) = 1.0
    uni = {"A": 0.5, "B": 0.5}
    assert math.isclose(compute_entropy(uni), 1.0, rel_tol=1e-4)


def test_sampling_service_full_pipeline() -> None:
    service = SamplingService()
    raw_logits = {
        "Paris": 12.0,
        "Lyon": 6.0,
        "Marseille": 5.5,
        "London": 4.0,
        "the": 3.0,
        "a": 1.0,
        "pizza": -2.0,
    }
    params = SamplingParameters(temperature=0.8, top_k=3, top_p=0.95, repetition_penalty=1.0)
    result = service.process_distribution("The capital of France is", raw_logits, params)

    assert result.argmax_token == "Paris"
    assert result.surviving_tokens_count <= 3
    # Check that surviving candidate probabilities sum to 1.0
    surviving_sum = sum(c.final_prob for c in result.candidates if not c.filtered)
    assert math.isclose(surviving_sum, 1.0, rel_tol=1e-5)
