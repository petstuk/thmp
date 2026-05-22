# Design Parity Audit (`design/` -> `frontend/`)

This audit tracks implementation parity between the standalone design prototype in `design/` and production UI in `frontend/`.

## Source-to-target mapping

- `design/src/theme.jsx` -> `frontend/src/index.css`, `frontend/src/lib/branding.ts`
  - Status: aligned; semantic severity/status/coverage tokens now live in `index.css` for both themes.
- `design/src/app.jsx` (IA and shell) -> `frontend/src/components/AppShell.tsx`, `frontend/src/App.tsx`
  - Status: aligned; grouped IA (Dashboard/Hypotheses/Hunt Board/Evidence/ATT&CK), role-matrix gating, sidebar identity/footer, bell-driven notifications, and width modes (`default`/`wide`/`full`).
- `design/src/hifi-hunt.jsx` -> `frontend/src/pages/KanbanPage.tsx`, `frontend/src/pages/HypothesisDetailPage.tsx`
  - Status: medium-high parity; board card chips, status/severity badges, avatar + ATT&CK count metadata, and full-width columns are now in place while preserving FSM behavior.
- `design/src/hifi-attack.jsx` -> `frontend/src/pages/AttackNavigatorPage.tsx`
  - Status: medium-high parity; coverage scale uses design tokens (`cov*`), gap emphasis, and right-side selected-technique details.
- `design/src/wireframes.jsx` (overview/evidence/integrations/admin) -> corresponding pages in `frontend/src/pages/`
  - Status: medium parity; shared primitives (`PageHeader`, `ThmpCard`, `SectionTitle`) applied across prototyped and fallback pages.

## Implemented in this pass

- Added semantic design tokens in `frontend/src/index.css`:
  - severity (`--sev-*`), lifecycle status (`--status-*`), ATT&CK coverage (`--cov-*`, `--cov-gap`).
- Refactored `frontend/src/components/ThreatBadges.tsx` to use semantic CSS variables.
- Added shared primitives under `frontend/src/components/thmp/`:
  - `PageHeader`, `ThmpCard`, `SectionTitle`, `ThmpLogo`, `UserAvatar`, `nav-icons`.
- Reworked shell + IA:
  - `frontend/src/components/AppShell.tsx`
  - `frontend/src/lib/nav-matrix.ts`
  - role-gated nav labels now mirror design intent, notifications moved to bell affordance, content width modes enabled.
- Hero screens upgraded:
  - `frontend/src/pages/KanbanPage.tsx`
  - `frontend/src/pages/AttackNavigatorPage.tsx`
- Added audit surface:
  - `frontend/src/pages/AuditLogPage.tsx`
  - route wiring in `frontend/src/App.tsx` (`/audit`).
- Fallback/prototyped page style pass:
  - `OverviewPage`, `HypothesesPage`, `HuntsPage`, `HuntDetailPage`, `FindingsPage`, `NotificationsPage`, `SearchResultsPage`, `IntegrationsPage`, `IngestionQueuePage`, `EvidenceHubPage`, `IdentityProvidersPage`, `ReportingPage`, `LoginPage`, `RegisterPage`.

## Remaining polish opportunities

1. Port additional micro-interactions from `design/src/primitives.jsx` (`IconBtn` hover/focus subtleties, optional command palette shell hint behavior).
2. Bring `HypothesisDetailPage` panel spacing and section visual hierarchy closer to wireframe parity.
3. Consider chunk splitting for large client bundle after UI parity work (build warning only; no functional impact).
