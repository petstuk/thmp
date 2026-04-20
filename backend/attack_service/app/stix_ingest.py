"""Ingest MITRE ATT&CK Enterprise STIX 2.1 bundle into the attack schema (sync / blocking)."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.models import SyncMeta, Tactic, Technique, TechniqueTactic
from app.stix_parse import (
    DEFAULT_BUNDLE_URL,
    _objects_from_bundle,
    extract_bundle_attack_version,
    parse_enterprise_bundle,
)


def upsert_catalog(
    session: Session,
    tactic_rows: list[dict[str, Any]],
    technique_rows: list[dict[str, Any]],
    *,
    bundle_attack_version: str | None = None,
) -> dict[str, int]:
    """Upsert tactics and techniques; rebuild technique_tactic links. Preserves technique UUIDs by stix_id."""
    tactic_by_short: dict[str, uuid.UUID] = {}
    for tr in tactic_rows:
        existing = session.execute(select(Tactic).where(Tactic.stix_id == tr["stix_id"])).scalar_one_or_none()
        if existing:
            existing.name = tr["name"]
            existing.short_name = tr["short_name"]
            existing.description = tr["description"]
            existing.updated_at = datetime.now(tz=timezone.utc)
            tid = existing.id
        else:
            t = Tactic(
                stix_id=tr["stix_id"],
                name=tr["name"],
                short_name=tr["short_name"],
                description=tr["description"],
            )
            session.add(t)
            session.flush()
            tid = t.id
        tactic_by_short[tr["short_name"]] = tid

    stix_to_uuid: dict[str, uuid.UUID] = {}
    for row in technique_rows:
        existing = session.execute(select(Technique).where(Technique.stix_id == row["stix_id"])).scalar_one_or_none()
        if existing:
            existing.mitre_id = row["mitre_id"]
            existing.name = row["name"]
            existing.description = row["description"]
            existing.is_subtechnique = row["is_subtechnique"]
            existing.platforms = row["platforms"]
            existing.updated_at = datetime.now(tz=timezone.utc)
            stix_to_uuid[row["stix_id"]] = existing.id
        else:
            tech = Technique(
                stix_id=row["stix_id"],
                mitre_id=row["mitre_id"],
                name=row["name"],
                description=row["description"],
                is_subtechnique=row["is_subtechnique"],
                parent_technique_id=None,
                platforms=row["platforms"],
            )
            session.add(tech)
            session.flush()
            stix_to_uuid[row["stix_id"]] = tech.id

    for row in technique_rows:
        pid_stix = row.get("parent_stix_id")
        if not pid_stix:
            continue
        child_id = stix_to_uuid.get(row["stix_id"])
        parent_id = stix_to_uuid.get(pid_stix)
        if child_id and parent_id:
            tech = session.get(Technique, child_id)
            if tech:
                tech.parent_technique_id = parent_id

    session.execute(delete(TechniqueTactic))
    for row in technique_rows:
        tid = stix_to_uuid.get(row["stix_id"])
        if not tid:
            continue
        for sn in row.get("tactic_short_names") or []:
            tact_uuid = tactic_by_short.get(sn)
            if tact_uuid:
                session.add(TechniqueTactic(technique_id=tid, tactic_id=tact_uuid))

    meta = session.execute(select(SyncMeta).limit(1)).scalar_one_or_none()
    if not meta:
        meta = SyncMeta()
        session.add(meta)
        session.flush()
    meta.last_sync_at = datetime.now(tz=timezone.utc)
    meta.source_url = os.environ.get("ATTACK_STIX_URL", DEFAULT_BUNDLE_URL)
    meta.bundle_attack_version = bundle_attack_version
    meta.notes = f"tactics={len(tactic_rows)} techniques={len(technique_rows)}"

    session.commit()
    return {"tactics": len(tactic_rows), "techniques": len(technique_rows)}


def ingest_bundle_bytes(raw: bytes, sync_url: str) -> dict[str, int]:
    import json

    data = json.loads(raw.decode("utf-8"))
    bundle_version = extract_bundle_attack_version(data)
    objects = _objects_from_bundle(data)
    tactic_rows, technique_rows, _ = parse_enterprise_bundle(objects)
    from sqlalchemy import create_engine

    engine = create_engine(sync_url, pool_pre_ping=True)
    SessionMaker = sessionmaker(engine, class_=Session, expire_on_commit=False)
    with SessionMaker() as session:
        return upsert_catalog(
            session, tactic_rows, technique_rows, bundle_attack_version=bundle_version
        )
