from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from thmp_cdk.types import NormalisedBatch


class ConnectorAdapter(ABC):
    """Base class for connector packages (see connector-spec.md)."""

    connector_id: str
    version: str

    def health_check(self, integration_config: dict[str, Any]) -> bool:
        """Return True if non-secret configuration looks usable (optional hook)."""
        return True

    @abstractmethod
    def normalise(
        self,
        raw_payload: bytes | dict[str, Any],
        *,
        workspace_id: UUID,
        integration_config: dict[str, Any],
    ) -> NormalisedBatch:
        """Map an external payload to THMP normalised shapes."""
