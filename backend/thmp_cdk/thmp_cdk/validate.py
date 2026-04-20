from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from thmp_cdk.types import NormalisedHypothesis


def validate_normalised_hypothesis(data: dict[str, Any]) -> NormalisedHypothesis:
    """Validate a single hypothesis dict (e.g. after JSON round-trip)."""
    return NormalisedHypothesis.model_validate(data)


def validate_normalised_hypothesis_lenient(data: dict[str, Any]) -> NormalisedHypothesis | None:
    """Return a model or None if validation fails (for skipping bad rows)."""
    try:
        return NormalisedHypothesis.model_validate(data)
    except ValidationError:
        return None
