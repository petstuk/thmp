from __future__ import annotations

from importlib.metadata import entry_points
from typing import Any

from fastapi import HTTPException, status
from thmp_cdk import ConnectorAdapter


def load_connector_adapter(connector_id: str) -> ConnectorAdapter:
    for ep in entry_points(group="thmp.connectors"):
        if ep.name == connector_id:
            loaded: Any = ep.load()
            if isinstance(loaded, type) and issubclass(loaded, ConnectorAdapter):
                return loaded()
            if callable(loaded):
                out = loaded()
                if not isinstance(out, ConnectorAdapter):
                    raise HTTPException(
                        status.HTTP_500_INTERNAL_SERVER_ERROR,
                        "Connector entry point must return ConnectorAdapter",
                    )
                return out
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Connector entry point must be a ConnectorAdapter class or factory",
            )
    raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown connector: {connector_id}")
