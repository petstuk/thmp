# ADR 0011: OIDC authentication

## Status

Accepted (2026-04-23)

## Context

Enterprise deployments expect SSO via OpenID Connect while retaining local username/password for labs and break-glass accounts.

## Decision

1. **Authlib-based OIDC** — User service exposes `GET /api/v1/auth/oidc/login` and callback routes; configuration is stored per identity provider (`IdentityProviderConfig`).
2. **JIT provisioning** — First successful OIDC login can create a `User` without a password hash and optionally assign a default workspace role.
3. **Local auth coexists** — JWT issuance is unified so hypothesis and other services do not branch on login method.

## Consequences

- IdP metadata and client secrets must be rotated on the IdP schedule.
- Workspace admins manage IdP rows via the Identity Providers admin UI / API.
