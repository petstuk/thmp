from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    slug: str
    role: str

    model_config = {"from_attributes": False}


class UserMeOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    workspaces: list[WorkspaceOut]


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceOut]


class WorkspaceMemberOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: str


class IntegrationConfigCreate(BaseModel):
    connector_id: str = Field(min_length=1, max_length=64)
    name: str | None = Field(default=None, max_length=256)
    config: dict[str, Any] = Field(default_factory=dict)
    secret_ref: str | None = Field(default=None, max_length=512)


class IntegrationConfigPatch(BaseModel):
    name: str | None = Field(default=None, max_length=256)
    config: dict[str, Any] | None = None
    secret_ref: str | None = Field(default=None, max_length=512)
    is_enabled: bool | None = None


class IntegrationConfigOut(BaseModel):
    id: UUID
    workspace_id: UUID
    connector_id: str
    name: str | None
    config: dict[str, Any]
    secret_ref: str | None
    is_enabled: bool

    model_config = {"from_attributes": False}


class InternalIntegrationConfigOut(BaseModel):
    id: UUID
    workspace_id: UUID
    connector_id: str
    config: dict[str, Any]
    secret_ref: str | None
    is_enabled: bool
