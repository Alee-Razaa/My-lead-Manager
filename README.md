# Lead Workspace

A protected workspace for turning uneven lead files into traceable, qualified, ready-to-act packages. It runs locally for development and is designed for Vercel with Supabase Postgres persistence. The first workflow prepares job applications; the data model remains reusable for other lead-processing work.

## Current slice

- Multiple CSV/XLSX import preview with deterministic field mapping.
- Original file, sheet, row and raw-value provenance.
- Exact duplicate linking and duplicate-file protection.
- Supabase Postgres migrations and transactional export-outbox foundation.
- Controlled model-routing policy; live AI is not connected yet.
- Password-protected manual workflow: batches of ten, qualification with reasons, research notes, approach links and drafts, Ready queue and explicit action tracking.
- Profile/criteria settings, master Excel snapshot and JSON backup downloads.
- AI requests are disabled for this pilot. No AI key is required.

## Run locally

Requirements: Node 24, pnpm 11, and a Supabase Postgres connection string.

```powershell
pnpm install
# Add DATABASE_URL to .env.local using the Supabase transaction pooler URL.
# Add a strong WORKSPACE_PASSWORD for the single-user pilot login.
pnpm dev
```

Open `http://127.0.0.1:3000`. Local environment files and private runtime data are excluded from Git.

For Vercel, set `DATABASE_URL` for Preview and Production and enable Deployment Protection before importing private data. Do not use the IPv6-only direct database URL; copy the transaction-pooler URL from Supabase Connect.
Set `WORKSPACE_PASSWORD` for each deployed environment. All workspace pages and data endpoints require a signed session; deployment protection may be used additionally.

## Try the manual pilot

Sign in, import CSV/XLSX (or paste a table), adjust field mappings, and open Batches. Select up to ten unassigned leads and start a batch. Review each lead, add research evidence and a decision reason, and prepare an approach link and draft. Qualified leads with evidence and an approach link can be marked Ready. Open the destination and perform the action yourself, then explicitly record the outcome. Download the master Excel again after changes.

Excel downloads are snapshots, not automatic file synchronization. Automated research, tailored resume files, restore/reconciliation and AI processing are not included in this pilot. Original source rows and values stay in the database and exports.

## Checks

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Product and architecture decisions live in `outputs/DEVELOPMENT.md`; visual rules live in `outputs/DESIGN.md`.
