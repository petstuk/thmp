from __future__ import annotations

from typing import FrozenSet

# Valid directed transitions (from_status, to_status)
ALLOWED_EDGES: frozenset[tuple[str, str]] = frozenset(
    {
        ("draft", "active"),
        ("draft", "closed"),
        ("active", "in_hunt"),
        ("active", "closed"),
        ("in_hunt", "validated"),
        ("in_hunt", "closed"),
        ("validated", "archived"),
        ("closed", "archived"),
    }
)

# Roles allowed for each (from_status, to_status) transition
EDGE_ROLES: dict[tuple[str, str], FrozenSet[str]] = {
    ("draft", "active"): frozenset({"analyst", "hunt_lead", "ti_analyst", "manager", "admin"}),
    ("draft", "closed"): frozenset({"hunt_lead", "manager", "admin"}),
    ("active", "in_hunt"): frozenset({"hunt_lead", "manager", "admin"}),
    ("active", "closed"): frozenset({"hunt_lead", "manager", "admin"}),
    ("in_hunt", "validated"): frozenset({"hunt_lead", "manager", "admin"}),
    ("in_hunt", "closed"): frozenset({"hunt_lead", "manager", "admin"}),
    ("validated", "archived"): frozenset({"manager", "admin"}),
    ("closed", "archived"): frozenset({"manager", "admin"}),
}


def assert_transition_allowed(from_status: str, to_status: str, role: str) -> None:
    if from_status == to_status:
        return
    edge = (from_status, to_status)
    if edge not in ALLOWED_EDGES:
        raise ValueError(f"Transition {from_status} -> {to_status} is not allowed")
    allowed_roles = EDGE_ROLES.get(edge, frozenset())
    if role not in allowed_roles:
        raise ValueError(f"Role {role} cannot perform transition {from_status} -> {to_status}")
