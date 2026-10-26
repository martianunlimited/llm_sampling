"""Core Sampling Service: Mathematical transformations, filtering, and decoding strategies."""

import math
import random

from src.schemas import (
    BeamHypothesis,
    DistributionResult,
    SamplingParameters,
    TokenCandidate,
)


def apply_repetition_penalty(
    logits: dict[str, float], context_tokens: list[str], penalty: float = 1.0
) -> dict[str, float]:
    """Apply repetition penalty to logits for tokens present in context."""
    if penalty <= 1.0 or not context_tokens:
        return dict(logits)

    context_set = {t.strip().lower() for t in context_tokens if t.strip()}
    penalized: dict[str, float] = {}

    for tok, val in logits.items():
        clean_tok = tok.strip().lower()
        if clean_tok in context_set:
            if val > 0:
                penalized[tok] = val / penalty
            else:
                penalized[tok] = val * penalty
        else:
            penalized[tok] = val

    return penalized


def compute_softmax(logits: dict[str, float], temperature: float = 1.0) -> dict[str, float]:
    """Numerically stable softmax with temperature scaling."""
    if not logits:
        return {}

    t = max(0.01, temperature)
    max_val = max(logits.values())

    exp_map = {tok: math.exp((val - max_val) / t) for tok, val in logits.items()}
    total = sum(exp_map.values())

    if total <= 0:
        uniform = 1.0 / len(logits)
        return {tok: uniform for tok in logits}

    return {tok: exp_val / total for tok, exp_val in exp_map.items()}


def apply_top_k_filter(probs: dict[str, float], k: int) -> tuple[dict[str, float], set[str]]:
    """Filter out tokens ranked beyond the top-k highest probabilities."""
    if k <= 0 or k >= len(probs):
        return dict(probs), set()

    sorted_items = sorted(probs.items(), key=lambda item: item[1], reverse=True)
    kept = dict(sorted_items[:k])
    filtered_out = {item[0] for item in sorted_items[k:]}
    return kept, filtered_out


def apply_top_p_filter(probs: dict[str, float], p: float) -> tuple[dict[str, float], set[str]]:
    """Nucleus filter: Keep smallest set of tokens whose cumulative mass >= p."""
    if p >= 1.0:
        return dict(probs), set()

    sorted_items = sorted(probs.items(), key=lambda item: item[1], reverse=True)
    kept: dict[str, float] = {}
    filtered_out: set[str] = set()
    cum_sum = 0.0

    for tok, prob in sorted_items:
        if cum_sum < p:
            kept[tok] = prob
            cum_sum += prob
        else:
            filtered_out.add(tok)

    # Ensure at least 1 token is always kept
    if not kept and sorted_items:
        first_tok, first_prob = sorted_items[0]
        kept[first_tok] = first_prob
        filtered_out.discard(first_tok)

    return kept, filtered_out


def apply_min_p_filter(probs: dict[str, float], min_p: float) -> tuple[dict[str, float], set[str]]:
    """Discard tokens whose probability is less than min_p * max_probability."""
    if min_p <= 0.0 or not probs:
        return dict(probs), set()

    max_p = max(probs.values())
    cutoff = min_p * max_p

    kept: dict[str, float] = {}
    filtered_out: set[str] = set()

    for tok, prob in probs.items():
        if prob >= cutoff:
            kept[tok] = prob
        else:
            filtered_out.add(tok)

    if not kept:
        # Keep argmax token
        top_item = max(probs.items(), key=lambda x: x[1])
        kept[top_item[0]] = top_item[1]
        filtered_out.discard(top_item[0])

    return kept, filtered_out


def renormalize(probs: dict[str, float]) -> dict[str, float]:
    """Renormalize probabilities so sum equals 1.0."""
    total = sum(probs.values())
    if total <= 0:
        uniform = 1.0 / len(probs) if probs else 0.0
        return {tok: uniform for tok in probs}
    return {tok: val / total for tok, val in probs.items()}


def compute_entropy(probs: dict[str, float]) -> float:
    """Calculate Shannon entropy in bits: -sum(p * log2(p))."""
    ent = 0.0
    for p in probs.values():
        if p > 1e-12:
            ent -= p * math.log2(p)
    return ent


class SamplingService:
    """Service to process logits, apply filters, and simulate decoding strategies."""

    def process_distribution(
        self, prompt: str, raw_logits: dict[str, float], params: SamplingParameters
    ) -> DistributionResult:
        """Process unnormalized logits through repetition penalty, temperature, and filters."""
        context_tokens = prompt.split()

        # 1. Repetition penalty
        penalized_logits = apply_repetition_penalty(
            raw_logits, context_tokens, penalty=params.repetition_penalty
        )

        # 2. Raw Softmax with Temperature
        raw_probs = compute_softmax(penalized_logits, temperature=params.temperature)

        # Sort descending by raw prob
        sorted_tokens = sorted(raw_probs.items(), key=lambda x: x[1], reverse=True)
        argmax_token = sorted_tokens[0][0] if sorted_tokens else ""

        # 3. Apply Filters sequentially: Top-k -> Top-p -> Min-p
        filter_reasons: dict[str, str] = {}

        # Top-K
        kept_k, out_k = apply_top_k_filter(raw_probs, params.top_k)
        for tok in out_k:
            filter_reasons[tok] = f"Top-k filter (rank > {params.top_k})"

        # Top-P Nucleus (evaluated on surviving tokens)
        kept_p, out_p = apply_top_p_filter(kept_k, params.top_p)
        for tok in out_p:
            filter_reasons[tok] = f"Top-p nucleus (threshold > {params.top_p:.2f})"

        # Min-P
        surviving, out_min = apply_min_p_filter(kept_p, params.min_p)
        for tok in out_min:
            filter_reasons[tok] = f"Min-p filter (< {params.min_p:.2f} * p_max)"

        # 4. Renormalize surviving probabilities
        renorm_probs = renormalize(surviving)

        # 5. Build candidate models with cumulative distribution
        candidates: list[TokenCandidate] = []
        running_cum = 0.0

        for tok, raw_p in sorted_tokens:
            is_filtered = tok not in surviving
            final_p = renorm_probs.get(tok, 0.0)
            if not is_filtered:
                running_cum += final_p

            candidate = TokenCandidate(
                token=tok,
                raw_logit=raw_logits.get(tok, 0.0),
                penalized_logit=penalized_logits.get(tok, 0.0),
                raw_prob=raw_p,
                filtered=is_filtered,
                filter_reason=filter_reasons.get(tok, ""),
                final_prob=final_p,
                cumulative_prob=min(1.0, running_cum) if not is_filtered else 0.0,
            )
            candidates.append(candidate)

        entropy = compute_entropy(renorm_probs)

        return DistributionResult(
            prompt=prompt,
            parameters=params,
            candidates=candidates,
            entropy=entropy,
            argmax_token=argmax_token,
            surviving_tokens_count=len(surviving),
        )

    def sample_token(
        self, candidates: list[TokenCandidate], random_val: float | None = None
    ) -> str:
        """Sample a token using cumulative distribution (simulated roulette roll)."""
        surviving = [c for c in candidates if not c.filtered and c.final_prob > 0]
        if not surviving:
            return candidates[0].token if candidates else ""

        roll = random.random() if random_val is None else random_val
        running = 0.0
        for c in surviving:
            running += c.final_prob
            if roll <= running:
                return c.token

        return surviving[-1].token

    def simulate_beam_search(
        self, prompt: str, beam_width: int = 3, max_steps: int = 2
    ) -> list[BeamHypothesis]:
        """Simulate Beam Search expanding hypotheses across multi-token horizons."""
        # Simple multi-step vocabulary projection demo
        beams: list[BeamHypothesis] = [
            BeamHypothesis(
                tokens=prompt.split(),
                text=prompt,
                cumulative_log_prob=0.0,
                score=0.0,
            )
        ]

        # Branching candidates library
        branch_library = {
            "is": [("Paris", -0.15), ("Lyon", -2.8), ("known", -3.2)],
            "Paris": [(",", -0.4), ("is", -1.2), ("was", -2.5)],
            ",": [("which", -0.5), ("the", -1.1), ("located", -2.0)],
        }

        for _ in range(max_steps):
            all_candidates: list[BeamHypothesis] = []
            for b in beams:
                last_tok = b.tokens[-1] if b.tokens else "is"
                extensions = branch_library.get(
                    last_tok, [("city", -0.5), ("region", -1.8), ("capital", -2.2)]
                )

                for next_tok, log_p in extensions:
                    new_tokens = b.tokens + [next_tok]
                    new_text = b.text + " " + next_tok
                    new_cum = b.cumulative_log_prob + log_p
                    score = new_cum / (len(new_tokens) ** 0.7)  # Length penalty
                    all_candidates.append(
                        BeamHypothesis(
                            tokens=new_tokens,
                            text=new_text,
                            cumulative_log_prob=new_cum,
                            score=score,
                        )
                    )

            # Keep top-B hypotheses
            all_candidates.sort(key=lambda x: x.score, reverse=True)
            beams = all_candidates[:beam_width]

        return beams
