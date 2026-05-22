import pytest

from app.hunt_fsm import assert_hunt_transition_allowed


def test_planned_to_active() -> None:
    assert_hunt_transition_allowed("planned", "active", "hunt_lead")


def test_cannot_skip_states() -> None:
    with pytest.raises(ValueError, match="not allowed"):
        assert_hunt_transition_allowed("planned", "completed", "manager")
