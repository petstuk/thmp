"""OpenSearch integration for cross-entity full-text search.

Index names:
  thmp_hypotheses   — Hypothesis records
  thmp_evidence     — Evidence records
  thmp_findings     — Finding records

All writes happen as background tasks (fire-and-forget with a single retry)
so they never block API responses.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_OPENSEARCH_URL = None


def _os_url() -> str | None:
    return os.environ.get("OPENSEARCH_URL")


def _client():  # type: ignore[return]
    url = _os_url()
    if not url:
        return None
    try:
        from opensearchpy import AsyncOpenSearch
        return AsyncOpenSearch(hosts=[url], use_ssl=False, verify_certs=False)
    except Exception:
        return None


_HYPOTHESIS_MAPPING = {
    "mappings": {
        "properties": {
            "workspace_id": {"type": "keyword"},
            "title": {"type": "text"},
            "description": {"type": "text"},
            "status": {"type": "keyword"},
            "severity": {"type": "keyword"},
            "owner_id": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "created_at": {"type": "date"},
            "updated_at": {"type": "date"},
        }
    }
}

_EVIDENCE_MAPPING = {
    "mappings": {
        "properties": {
            "workspace_id": {"type": "keyword"},
            "hypothesis_id": {"type": "keyword"},
            "title": {"type": "text"},
            "content": {"type": "text"},
            "type": {"type": "keyword"},
            "submitted_by": {"type": "keyword"},
            "created_at": {"type": "date"},
        }
    }
}

_FINDING_MAPPING = {
    "mappings": {
        "properties": {
            "workspace_id": {"type": "keyword"},
            "hypothesis_id": {"type": "keyword"},
            "title": {"type": "text"},
            "summary": {"type": "text"},
            "created_at": {"type": "date"},
        }
    }
}

_INDICES: dict[str, dict] = {
    "thmp_hypotheses": _HYPOTHESIS_MAPPING,
    "thmp_evidence": _EVIDENCE_MAPPING,
    "thmp_findings": _FINDING_MAPPING,
}


async def ensure_indices() -> None:
    """Create indices if they don't exist. Called at startup."""
    client = _client()
    if client is None:
        return
    try:
        for name, body in _INDICES.items():
            exists = await client.indices.exists(index=name)
            if not exists:
                await client.indices.create(index=name, body=body)
    except Exception:
        logger.warning("OpenSearch ensure_indices failed", exc_info=True)
    finally:
        await client.close()


async def _index_doc(index: str, doc_id: str, body: dict[str, Any], retries: int = 1) -> None:
    client = _client()
    if client is None:
        return
    try:
        await client.index(index=index, id=doc_id, body=body)
    except Exception:
        if retries > 0:
            await asyncio.sleep(2)
            await _index_doc(index, doc_id, body, retries - 1)
        else:
            logger.warning("OpenSearch index failed for %s/%s", index, doc_id, exc_info=True)
    finally:
        await client.close()


def _fire(coro: Any) -> None:
    """Schedule indexing as a background task without blocking the caller."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        pass


def index_hypothesis(h: Any, workspace_id: str | None = None) -> None:
    ws = workspace_id or str(getattr(h, "workspace_id", ""))
    body = {
        "workspace_id": ws,
        "title": h.title or "",
        "description": h.description or "",
        "status": h.status or "",
        "severity": h.severity or "",
        "owner_id": str(h.owner_id) if h.owner_id else None,
        "tags": list(h.tags or []),
        "created_at": h.created_at.isoformat() if h.created_at else None,
        "updated_at": h.updated_at.isoformat() if h.updated_at else None,
    }
    _fire(_index_doc("thmp_hypotheses", str(h.id), body))


def index_evidence(ev: Any, workspace_id: str | None = None) -> None:
    ws = workspace_id or str(getattr(ev, "workspace_id", "") or "")
    body = {
        "workspace_id": ws,
        "hypothesis_id": str(ev.hypothesis_id),
        "title": ev.title or "",
        "content": ev.content or "",
        "type": ev.type or "",
        "submitted_by": str(ev.submitted_by) if ev.submitted_by else None,
        "created_at": ev.created_at.isoformat() if ev.created_at else None,
    }
    _fire(_index_doc("thmp_evidence", str(ev.id), body))


def index_finding(finding: Any) -> None:
    body = {
        "workspace_id": str(getattr(finding, "workspace_id", "") or ""),
        "hypothesis_id": str(finding.hypothesis_id) if finding.hypothesis_id else None,
        "title": finding.title or "",
        "summary": getattr(finding, "summary", "") or "",
        "created_at": finding.created_at.isoformat() if finding.created_at else None,
    }
    _fire(_index_doc("thmp_findings", str(finding.id), body))


async def search(
    q: str,
    workspace_id: str,
    types: list[str] | None = None,
    size: int = 20,
) -> list[dict[str, Any]]:
    """Full-text search across requested entity types.

    Returns list of hits: [{id, type, title, snippet, workspace_id}].
    """
    client = _client()
    if client is None:
        return []

    type_index_map = {
        "hypothesis": "thmp_hypotheses",
        "evidence": "thmp_evidence",
        "finding": "thmp_findings",
    }
    active_types = types or list(type_index_map.keys())
    indices = [type_index_map[t] for t in active_types if t in type_index_map]
    if not indices:
        return []

    query: dict[str, Any] = {
        "query": {
            "bool": {
                "must": {"multi_match": {"query": q, "fields": ["title^2", "description", "content", "summary"]}},
                "filter": {"term": {"workspace_id": workspace_id}},
            }
        },
        "size": size,
    }
    results: list[dict[str, Any]] = []
    try:
        resp = await client.search(index=",".join(indices), body=query)
        for hit in resp["hits"]["hits"]:
            src = hit["_source"]
            index_name = hit["_index"]
            entity_type = next((t for t, idx in type_index_map.items() if idx == index_name), index_name)
            results.append(
                {
                    "id": hit["_id"],
                    "type": entity_type,
                    "title": src.get("title") or src.get("summary") or "",
                    "snippet": (src.get("description") or src.get("content") or src.get("summary") or "")[:200],
                    "workspace_id": src.get("workspace_id"),
                    "score": hit["_score"],
                }
            )
    except Exception:
        logger.warning("OpenSearch search failed", exc_info=True)
    finally:
        await client.close()
    return results
