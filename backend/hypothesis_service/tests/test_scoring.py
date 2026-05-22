from __future__ import annotations

from types import SimpleNamespace

from app.scoring import DEFAULT_WEIGHTS, analyst_factor, evidence_factor, signal_factor


def test_analyst_factor_none_is_neutral() -> None:
    h = SimpleNamespace(analyst_confidence_1_5=None)
    assert analyst_factor(h) == 0.5


def test_analyst_factor_clamped() -> None:
    h = SimpleNamespace(analyst_confidence_1_5=5)
    assert analyst_factor(h) == 1.0
    h2 = SimpleNamespace(analyst_confidence_1_5=0)
    assert analyst_factor(h2) == 0.0


def test_signal_factor_from_column() -> None:
    h = SimpleNamespace(signal_strength_0_1=0.5, source_ref=None)
    assert signal_factor(h) == 0.5


def test_signal_factor_from_source_ref() -> None:
    h = SimpleNamespace(signal_strength_0_1=None, source_ref={"signal_strength": 0.8})
    assert signal_factor(h) == 0.8


def test_signal_factor_default() -> None:
    h = SimpleNamespace(signal_strength_0_1=None, source_ref={})
    assert signal_factor(h) == 0.3


def test_evidence_factor_empty() -> None:
    assert evidence_factor([]) == 0.0


def test_evidence_factor_supporting() -> None:
    ev = [
        SimpleNamespace(weight=1.0, supports_hypothesis=True),
        SimpleNamespace(weight=0.5, supports_hypothesis=True),
    ]
    v = evidence_factor(ev)
    assert 0.0 < v <= 1.0


def test_default_weights_sum_to_one() -> None:
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-6
