from __future__ import annotations

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
