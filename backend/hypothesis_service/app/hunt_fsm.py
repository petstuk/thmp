from __future__ import annotations

from typing import FrozenSet

HUNT_ALLOWED: frozenset[tuple[str, str]] = frozenset(
    {
        ("planned", "active"),
        ("planned", "cancelled"),
        ("active", "completed"),
        ("active", "cancelled"),
    }
)

HUNT_EDGE_ROLES: dict[tuple[str, str], FrozenSet[str]] = {
    ("planned", "active"): frozenset({"hunt_lead", "manager", "admin"}),
    ("planned", "cancelled"): frozenset({"hunt_lead", "manager", "admin"}),
    ("active", "completed"): frozenset({"hunt_lead", "manager", "admin"}),
    ("active", "cancelled"): frozenset({"hunt_lead", "manager", "admin"}),
}


def assert_hunt_transition_allowed(from_status: str, to_status: str, role: str) -> None:
    if from_status == to_status:
        return
    edge = (from_status, to_status)
    if edge not in HUNT_ALLOWED:
        raise ValueError(f"Hunt transition {from_status} -> {to_status} is not allowed")
    allowed = HUNT_EDGE_ROLES.get(edge, frozenset())
    if role not in allowed:
        raise ValueError(f"Role {role} cannot perform hunt transition {from_status} -> {to_status}")
