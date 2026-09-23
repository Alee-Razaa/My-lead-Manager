# Lead Workspace

A local-first workspace for turning uneven lead files into traceable, qualified, ready-to-act packages. The first workflow prepares job applications; the data model remains reusable for other lead-processing work.

## Current slice

- Multiple CSV/XLSX import preview with deterministic field mapping.
- Original file, sheet, row and raw-value provenance.
- Exact duplicate linking and duplicate-file protection.
- SQLite migrations and export outbox foundation.
- Controlled model-routing policy; live AI is not connected yet.

## Run locally

Requirements: Node 24 and pnpm 11.

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`. Private runtime data is stored under `data/` and excluded from Git.

## Checks

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Product and architecture decisions live in `outputs/DEVELOPMENT.md`; visual rules live in `outputs/DESIGN.md`.
