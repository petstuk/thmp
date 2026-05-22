# Frontend UI (THMP)

The web app lives under [`frontend/`](../frontend/). Stack:

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`, [`frontend/src/index.css`](../frontend/src/index.css))
- **shadcn/ui** (Radix primitives, components copied into [`frontend/src/components/ui/`](../frontend/src/components/ui/))
- **next-themes** for **light / dark / system** via a `class` on `<html>` (`ThemeProvider` in [`frontend/src/main.tsx`](../frontend/src/main.tsx))

## Theming

- Semantic colors are defined as CSS variables in `index.css` (`:root` for light, `.dark` for dark). Prefer utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, and shadcn component tokens—not raw hex in feature code.
- **Theme** control lives in the app shell (see below), implemented by [`frontend/src/components/theme-toggle.tsx`](../frontend/src/components/theme-toggle.tsx).

## Adding a shadcn component

From `frontend/`:

```bash
npx shadcn@latest add <component-name>
```

Imports use the `@/` alias (see [`frontend/tsconfig.json`](../frontend/tsconfig.json) and [`frontend/vite.config.ts`](../frontend/vite.config.ts)).

## Information architecture

- **Overview** (`/`) shows counts and lists **only from real API responses** (hypotheses list, hunts, findings). There are no placeholder metrics. The Evidence tile does **not** show a workspace-wide total until an aggregate API exists; it links to the Evidence hub instead. When hypotheses, hunts, and findings are all empty (and those requests succeeded), a **Next steps** card suggests creating a hypothesis and reminds about ATT&CK sync when relevant.
- **App shell** ([`frontend/src/components/AppShell.tsx`](../frontend/src/components/AppShell.tsx)):
  - **`lg` and up:** fixed **sidebar** (200px) with grouped **Work** (Dashboard, Hypotheses, Hunt Board, Evidence, ATT&CK) and **Platform** (Integrations + nested Ingestion Queue, Reports, Audit Log by role) links; sidebar also includes workspace switcher and user footer.
  - **Top chrome:** search, Navigator JSON export, notifications bell (`/notifications`), theme toggle, and logout. Content width is route-controlled via `layout` prop (`default`, `wide`, `full`).
  - **Below `lg`:** a **Sheet** menu mirrors role-visible nav links; compact top bar keeps THMP branding, notifications, theme, logout, plus workspace and Navigator controls.
- **Role visibility matrix** lives in [`frontend/src/lib/nav-matrix.ts`](../frontend/src/lib/nav-matrix.ts), ported from design `NAV_MATRIX`.
- **Audit Log** is available at `/audit` (role-gated) and consumes `GET /api/v1/audit/events`.
- **Evidence** in the API is scoped to a hypothesis; the **Evidence hub** (`/evidence`) lists **all evidence in the workspace** via `GET /api/v1/evidence/hub` with filters and optional OpenSearch (`/api/v1/search?types=evidence`). Row actions link to the parent hypothesis and support file download.
- **Ingestion queue** (`/ingestion`) filters connector drafts by **`ingest_triage`** (auto vs review using ingest confidence) and supports bulk accept/dismiss when roles allow.
- **Integrations** — Schema-driven config forms for known connector IDs, optional **secret_ref** on create/patch, and **Test connection** (`health_check` via ingestion).
- **Hypothesis detail** — Comments support **`MentionTextarea`** (`@[label](user:uuid)` tokens) backed by `GET /api/v1/workspaces/{id}/members`. **Screenshot annotator** exports PNG + stores annotation vectors in **`evidence.metadata`** on upload.
- **Reporting** route provides report generation, template selection, export history, and interval schedules. Navigator layer JSON export remains available from the shell header for ATT&CK-native workflows.
- **Shared visual primitives** are under [`frontend/src/components/thmp/`](../frontend/src/components/thmp/) and are used for both prototyped and fallback pages (`PageHeader`, `ThmpCard`, logo/avatar/icon atoms).
- Route ↔ service overview: [frontend-routes.md](frontend-routes.md).

## Verification

```bash
cd frontend && npm run lint && npm run build
```
