from __future__ import annotations

# OpenCTI entity types supported for normalisation
SUPPORTED_ENTITY_TYPES = frozenset(
    {
        "Report",
        "Indicator",
        "Threat-Actor",
        "Malware",
        "Attack-Pattern",
    }
)

# Map OpenCTI kill chain phase names to ATT&CK tactic names (best-effort)
KILL_CHAIN_TACTIC_MAP: dict[str, str] = {
    "reconnaissance": "Reconnaissance",
    "resource-development": "Resource Development",
    "initial-access": "Initial Access",
    "execution": "Execution",
    "persistence": "Persistence",
    "privilege-escalation": "Privilege Escalation",
    "defense-evasion": "Defense Evasion",
    "credential-access": "Credential Access",
    "discovery": "Discovery",
    "lateral-movement": "Lateral Movement",
    "collection": "Collection",
    "command-and-control": "Command and Control",
    "exfiltration": "Exfiltration",
    "impact": "Impact",
}
