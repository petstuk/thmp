# 3. Workspace multi-tenancy

Date: 2026-04-19

## Status

Accepted

## Context

Enterprises need isolation between teams or business units. THMP must enforce access control and data scope without mixing tenant data in application logic errors.

## Decision

- **Tenancy key:** `workspace_id` on all tenant-owned entities (see [data-model.md](../architecture/data-model.md)).
- **Membership:** Users belong to workspaces through a junction with **per-workspace roles** (Analyst, Hunt Lead, TI Analyst, Manager, Admin, Read Only as built-ins; custom roles in a later phase).
- **Authorisation:** RBAC checks always include `workspace_id` from the resource or from explicit context; cross-workspace access is denied by default.
- **Integrations:** Integration Config and Notification Rules are scoped per workspace.

## Consequences

- APIs accept workspace context via path prefix, header, or inferred from resource IDs — exact routing is an implementation detail documented in the API spec; consistency across services is mandatory.
- Global admin operations (platform Admin) are modelled explicitly and audited; they do not bypass tenancy checks silently.
