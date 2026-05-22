from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ReportType = Literal["hypothesis", "hunt", "coverage", "summary"]
JobStatus = Literal["queued", "running", "succeeded", "failed"]


class ReportTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    template_body: str = Field(min_length=1)
    branding: dict[str, Any] = Field(default_factory=dict)


class ReportTemplatePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    template_body: str | None = None
    branding: dict[str, Any] | None = None


class ReportTemplateOut(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    template_body: str
    branding: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportJobCreate(BaseModel):
    report_type: ReportType
    template_id: UUID | None = None
    params: dict[str, Any] = Field(default_factory=dict)


class ReportJobOut(BaseModel):
    id: UUID
    workspace_id: UUID
    report_type: str
    template_id: UUID | None
    status: str
    params: dict[str, Any]
    error: str | None
    pdf_key: str | None
    stix_key: str | None
    created_by: UUID
    created_by_email: str
    created_by_role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    report_type: ReportType
    template_id: UUID | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    recipients: dict[str, Any] = Field(default_factory=dict)
    cron: str | None = Field(default=None, max_length=64)
    interval_minutes: int = Field(default=1440, ge=1, le=10080)
    enabled: bool = True


class ReportSchedulePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    report_type: ReportType | None = None
    template_id: UUID | None = None
    params: dict[str, Any] | None = None
    recipients: dict[str, Any] | None = None
    cron: str | None = Field(default=None, max_length=64)
    interval_minutes: int | None = Field(default=None, ge=1, le=10080)
    enabled: bool | None = None


class ReportScheduleOut(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    report_type: str
    template_id: UUID | None
    params: dict[str, Any]
    recipients: dict[str, Any]
    cron: str | None
    interval_minutes: int
    enabled: bool
    created_by: UUID
    created_by_email: str
    created_by_role: str
    last_run_at: datetime | None
    next_run_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportPreviewOut(BaseModel):
    html: str


class InternalAuditEvent(BaseModel):
    actor_user_id: UUID | None = None
    actor_ip: str | None = None
    action: str
    entity_type: str
    entity_id: UUID
    workspace_id: UUID | None = None
    diff: dict[str, Any]
    request_id: str | None = None
