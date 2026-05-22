from __future__ import annotations

# Tenable severity → THMP severity
TENABLE_SEVERITY_MAP: dict[str, str] = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "info": "informational",
}

# ATT&CK techniques pre-suggested for high/critical vulnerability findings
HIGH_SEVERITY_ATTACK_HINTS = [
    "T1190",  # Exploit Public-Facing Application
    "T1203",  # Exploitation for Client Execution
]
