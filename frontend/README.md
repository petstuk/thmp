# THMP frontend

Vite + React + TypeScript. Styling uses **Tailwind CSS v4** and **shadcn/ui** (Radix-based components under `src/components/ui/`). **next-themes** provides light, dark, and system appearance via a class on `<html>`.

The signed-in shell includes **Overview** (`/`), **Hypotheses**, **Hunts**, **Evidence** (hub), **Findings**, and **Reporting** (placeholder). See [../docs/frontend-routes.md](../docs/frontend-routes.md).

For local development, API calls use the Vite dev server proxy (`/api` → gateway); see [../docs/development.md](../docs/development.md). Contributor notes for UI and adding shadcn components: [../docs/frontend-ui.md](../docs/frontend-ui.md).

```bash
npm install
npm run dev
npm run build
npm run lint
```
