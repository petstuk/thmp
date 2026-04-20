from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Tactic(Base):
    __tablename__ = "tactics"
    __table_args__ = {"schema": "attack"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stix_id: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    short_name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    technique_links: Mapped[list[TechniqueTactic]] = relationship("TechniqueTactic", back_populates="tactic")


class Technique(Base):
    __tablename__ = "techniques"
    __table_args__ = {"schema": "attack"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stix_id: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    mitre_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_subtechnique: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    parent_technique_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attack.techniques.id"), nullable=True
    )
    platforms: Mapped[list[str] | None] = mapped_column(ARRAY(String(128)), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tactic_links: Mapped[list[TechniqueTactic]] = relationship("TechniqueTactic", back_populates="technique")


class TechniqueTactic(Base):
    __tablename__ = "technique_tactics"
    __table_args__ = {"schema": "attack"}

    technique_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attack.techniques.id", ondelete="CASCADE"), primary_key=True
    )
    tactic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attack.tactics.id", ondelete="CASCADE"), primary_key=True
    )

    technique: Mapped[Technique] = relationship("Technique", back_populates="tactic_links")
    tactic: Mapped[Tactic] = relationship("Tactic", back_populates="technique_links")


class SyncMeta(Base):
    __tablename__ = "sync_meta"
    __table_args__ = {"schema": "attack"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bundle_attack_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
