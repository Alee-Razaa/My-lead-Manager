# Lead Workspace

A protected workspace for turning uneven lead files into traceable, qualified, ready-to-act packages. It runs locally for development and is designed for Vercel with Supabase Postgres persistence. The first workflow prepares job applications; the data model remains reusable for other lead-processing work.

## Current slice

- Multiple CSV/XLSX import preview with deterministic field mapping.
- Original file, sheet, row and raw-value provenance.
- Exact duplicate linking and duplicate-file protection.
- Supabase Postgres migrations and transactional export-outbox foundation.
- Controlled model-routing policy; live AI is not connected yet.

## Run locally

Requirements: Node 24, pnpm 11, and a Supabase Postgres connection string.

```powershell
pnpm install
# Add DATABASE_URL to .env.local using the Supabase transaction pooler URL.
pnpm dev
```

Open `http://127.0.0.1:3000`. Local environment files and private runtime data are excluded from Git.

For Vercel, set `DATABASE_URL` for Preview and Production and enable Deployment Protection before importing private data. Do not use the IPv6-only direct database URL; copy the transaction-pooler URL from Supabase Connect.

## Checks

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Product and architecture decisions live in `outputs/DEVELOPMENT.md`; visual rules live in `outputs/DESIGN.md`.
