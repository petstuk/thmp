# Frontend UI (THMP)

The web app lives under [`frontend/`](../frontend/). Stack:

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`, [`frontend/src/index.css`](../frontend/src/index.css))
- **shadcn/ui** (Radix primitives, components copied into [`frontend/src/components/ui/`](../frontend/src/components/ui/))
- **next-themes** for **light / dark / system** via a `class` on `<html>` (`ThemeProvider` in [`frontend/src/main.tsx`](../frontend/src/main.tsx))

## Theming

- Semantic colors are defined as CSS variables in `index.css` (`:root` for light, `.dark` for dark). Prefer utilities such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, and shadcn component tokens—not raw hex in feature code.
- The floating **theme control** uses [`frontend/src/components/theme-toggle.tsx`](../frontend/src/components/theme-toggle.tsx).

## Adding a shadcn component

From `frontend/`:

```bash
npx shadcn@latest add <component-name>
```

Imports use the `@/` alias (see [`frontend/tsconfig.json`](../frontend/tsconfig.json) and [`frontend/vite.config.ts`](../frontend/vite.config.ts)).

## Information architecture

- **Overview** (`/`) shows counts and lists **only from real API responses** (hypotheses list, hunts, findings). There are no placeholder metrics.
- **App shell** ([`frontend/src/components/AppShell.tsx`](../frontend/src/components/AppShell.tsx)): workspace selector, ATT&CK banner, main nav (Overview, Hypotheses, Hunts, Evidence, Findings, Reporting), Navigator JSON export, theme toggle, logout.
- **Evidence** in the API is scoped to a hypothesis; the Evidence hub lists hypotheses so you can open detail to add or review evidence.
- **Reporting** route is a short placeholder until Reporting APIs exist; use Navigator layer in the shell for current export needs.
- Route ↔ service overview: [frontend-routes.md](frontend-routes.md).

## Verification

```bash
cd frontend && npm run build && npm run lint
```
