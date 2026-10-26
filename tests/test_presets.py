"""Unit tests for Sampling preset scenarios."""

from src.core.preset_data import get_all_presets, get_preset_by_id


def test_presets_exist() -> None:
    presets = get_all_presets()
    assert len(presets) >= 5


def test_presets_validation() -> None:
    presets = get_all_presets()
    categories = {p.category for p in presets}
    assert "Factual Recall" in categories
    assert "Creative Storytelling" in categories
    assert "Repetitive Loop" in categories
    assert "Code Completion" in categories

    for p in presets:
        assert p.id
        assert p.title
        assert len(p.candidates) >= 5
        assert len(p.explanation) > 30


def test_get_preset_by_id() -> None:
    preset = get_preset_by_id("factual-paris")
    assert preset is not None
    assert "Paris" in preset.candidates
    assert preset.candidates["Paris"] > 10.0

    missing = get_preset_by_id("non-existent")
    assert missing is None
