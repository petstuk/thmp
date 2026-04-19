import pytest

from app.fsm import assert_transition_allowed


def test_happy_path_hunt_flow() -> None:
    assert_transition_allowed("draft", "active", "analyst")
    assert_transition_allowed("active", "in_hunt", "hunt_lead")
    assert_transition_allowed("in_hunt", "validated", "manager")
    assert_transition_allowed("validated", "archived", "admin")


def test_invalid_edge() -> None:
    with pytest.raises(ValueError, match="not allowed"):
        assert_transition_allowed("draft", "validated", "admin")


def test_wrong_role() -> None:
    with pytest.raises(ValueError, match="cannot perform"):
        assert_transition_allowed("active", "in_hunt", "analyst")
