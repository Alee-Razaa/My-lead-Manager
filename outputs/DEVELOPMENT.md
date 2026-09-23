# Lead Workspace — development plan

Status: proposed implementation plan, ready for review. No application or AI integration has been built.
Prepared: 2026-09-24.

## 1. Release outcome

Version 1 must turn uneven lead files into researched, qualified, ready-to-apply packages, in batches of ten. The user opens a destination, downloads the tailored resume, copies answers or a message, performs the action, and records the outcome. The master workbook and activity tracker then reflect that action.

The core is generic: leads, source records, batches, evidence, assessments, preparation artifacts, and activities. Job-specific criteria and templates belong to the first workflow configuration, not hard-coded global fields.

Release gate: a real ten-lead batch can move from multiple imports through research and qualification to usable application packages and recorded user actions, with provenance and workbook synchronization verified. A polished mockup alone is not release 1.

## 2. Form factor and architecture

Build a single-user local web application, bound to localhost by default. Browser UI and a local Node service share one repository and source tree. Keep an independently runnable background worker for durable tasks; do not keep long research work alive inside a page request. The machine must remain running for jobs to progress. Hosted deployment, multi-user access, and desktop packaging are later phases.

Proposed stack: Node 24 LTS family; Next.js App Router and React with strict TypeScript; SQLite for operational transactions; a validated schema layer; one workbook adapter; accessible reusable UI primitives; unit/integration tests plus Playwright end-to-end checks. Resolve and pin compatible package versions during the foundation milestone, after checking existing packages and official documentation. Prefer installed suitable libraries over adding overlapping ones.

Runtime inspected: Node v24.19.0, Git 2.52.0.windows.1, and ripgrep available. npm was not discoverable on PATH and the inspected Node bin folder contains only node.exe. Resolve a supported package manager before scaffolding. Local Git is initialized on `main`; `origin` is connected to `https://github.com/Alee-Razaa/My-lead-Manager.git`. The remote is currently empty, so there is no upstream history to merge.

```
Browser screens
    -> validated application services
    -> domain rules + SQLite transactions + durable task queue
    -> background worker
       -> research adapter / AI adapter / document renderer
    -> export outbox -> single Excel writer -> verified workbook revision
```

All application source belongs under:

```
src/
  app/                 routes and thin server endpoints
  components/          shared accessible UI
  domain/              entities, qualification rules, transitions
  services/            import, batching, processing, preparation, outcomes
  adapters/            database, workbook, AI, research, document output
  workflows/           versioned job workflow, generic contracts, prompts
  worker/              durable queue runner
  tests/               integration, end-to-end and synthetic fixtures
```

Unit tests may be colocated under src. Root files contain build/tool configuration only. `data/` stores private originals, the database, workbook, backups, and generated packages outside Git. `work/` stores disposable development notes. `outputs/` contains maintained review documents.

## 3. The workbook is the lasting business asset

SQLite is the transactional execution store. The primary Excel workbook is the required durable, portable business record, not a casual optional export. This split avoids having parallel workers mutate an open spreadsheet.

Required workbook sheets:
- Master_Leads: permanent ID, consolidated information, current workflow assessment, stage and latest outcome.
- Source_Records: raw values, original file/sheet/row, import and source IDs, mapped lead ID.
- Batches: one row per batch membership, batch ID, source ranges/exact rows, progress and revision.
- Qualified_Queue: workflow-qualified leads and preparation state, linked by lead ID.
- Activity_Tracker: append-only action events, channel, destination, timestamp, notes, follow-up.
- Research_Evidence: claim, value, source URL, checked time, confidence/verification state.
- Decision_History: workflow and criteria version, previous/new decision, rationale, profile version.

Create stable IDs before enrichment. Preserve raw source values separately from researched values. Store workflow-specific attributes in an extensible structure with selected readable workbook columns. For oversized descriptions or artifacts, store durable relative references with hashes; never silently truncate or lose Excel cell overflow.

Synchronization protocol: commit operation plus export-outbox item in one database transaction; one writer exports to a temporary file, verifies sheets/IDs/counts, then replaces the workbook while keeping a backup. Record the exported revision. SQLite and XLSX are not one atomic transaction: expose pending, saved, and failed synchronization states honestly. A workbook lock must produce a retryable error, not overwrite data or claim success. Restart retries the same revision idempotently.

Detect external workbook edits using revision/hash checks. Provide an import/reconcile preview using stable IDs. Preserve manual notes, surface conflicts, and pause export until resolved. Do not attempt invisible bidirectional synchronization. Include tested backup/restore and workbook-to-database recovery for supported fields; originals and artifacts need the full data-folder backup.

## 4. Import and provenance contract

Accept multiple CSV and XLSX files, multiple chosen sheets, and pasted tables. V1 handles uneven headers, missing columns, blank rows, quoted multiline CSV, delimiter differences, and duplicate files. Show encoding or parsing ambiguities instead of silently corrupting text. Add URL-only leads through the same mapping flow.

Preview mappings and persist reusable mappings per source. Preserve unknown columns. Store original file hash, filename, contributor, import timestamp, sheet, header mapping, raw row, and source record ID.

For CSV, record logical data-record ordinal; quoted newlines mean this is not necessarily a physical text-line number. For XLSX, record the original sheet row number. Show the convention in batch manifests. Sorting the app or workbook must never modify original provenance.

Deduplicate exact file imports and exact source identities deterministically. Link repeated observations to an existing lead where identity is certain. Queue fuzzy company/title/contact matches for review; do not merge different opportunities merely because the company matches. Preserve competing field values and their sources.

## 5. Batch and task semantics

Default ten leads, with a user-selectable smaller final batch. Show exact members, original rows and contiguous ranges before starting. Atomic reservations prevent duplicate processing of the same lead/workflow/version. Persist steps and checkpoints per lead; resume unfinished work after interruption. A new run never resets completed records.

States are separate:
- Assessment: unassessed / qualified / rejected / needs_information.
- Execution: queued / researching / qualifying / enriching / preparing / ready / blocked / completed.
- Action: not_actioned / applied / email_sent / whatsapp_sent / other_contact / replied / closed.

Assessment is versioned by workflow, criteria, profile, and evidence. Failure to fetch a page is not rejection. Draft preparation is not an external action. Multiple activities and channels may belong to one lead. Retry keys include lead, stage and input version. Partial failures do not discard successful members.

## 6. First workflow: application readiness

Inputs: user-provided resume/experience text, role preferences, eligibility facts and sample lead files. Do not infer these from the machine location. Keep the 15-day window, experience rule, minimum match threshold and Pakistan/remote scope configurable. Confirm the intended threshold semantics before using the previous ambiguous 'up to 60%' instruction.

Stages:
1. Locate original vacancy and complete missing description, date, deadline and requirements.
2. Verify it is open, assess eligibility, and map requirements to cited profile facts. Unknown mandatory facts block readiness.
3. Save qualification and rationale. Only qualified leads enter the qualified sheet and enrichment route.
4. Find the official application method and relevant publicly listed recruiting contacts. Label evidence and last-checked time. Do not present guessed contacts as verified. Rank a recommended route; alternate channels are optional, not a mass-contact instruction.
5. Generate a truthful tailored resume, channel-specific draft and known application answers. Lock factual employment history, credentials and metrics to profile evidence. New facts require user input.
6. Render a consistent DOCX/PDF resume as supported by the first renderer; visually inspect representative files and validate text extraction. Include a package manifest linking artifacts, job, profile and prompt versions.
7. Present apply URL, files, copyable text, sources, gaps, and exact next steps in one Ready screen. If an unknown assessment or form remains, label the package 'needs input' rather than fully ready.
8. User manually acts and records the outcome; persist an activity event and synchronize workbook sheets.

AI connection: implement provider-neutral contracts, then one real provider. Credentials remain server-side. This app does not inherit access from the current chat or a subscription. Research needs an actual approved search/fetch provider. Missing credentials appear as setup-required; development fixtures are clearly marked simulated. No silent mock fallback.

Treat fetched pages as untrusted data. Restrict server fetches to public HTTP(S), block local/private network destinations and recheck redirects, bound size/time, and never execute remote content. Imports are data only; protect CSV exports from formula injection, limit archive expansion, and reject unsupported active content.

## 7. Design and screens

See DESIGN.md for the preloaded visual and interaction contract. The main navigation is Imports, Batches, Qualified, Ready, Activity, and Profile/Workflow settings. Inside a batch, a stage strip acts as the node interface; an editable graph builder is not required.

Screen layout: compact left navigation, central working surface, contextual right inspector. Research and messages belong to selected lead IDs. GPT instructions should be scoped to the selected lead/batch; proposed record edits show a diff, source and undo where appropriate. Store useful decisions, not a second unbounded chat transcript as the database.

## 8. Implementation milestones and gates

M0 — Foundation: resolve package manager, inspect versions, initialize app in existing root, establish one lockfile, environment example, schema/migrations, design tokens, lint/type/test scripts. Check boot and production build. No second project folder.

M1 — Data spine: multiple imports, mapping preview, provenance, dedup review, batch reservation, master workbook writer and reconciliation detection. Gate: synthetic uneven files round-trip without data loss; duplicate import adds no repeated leads; locked workbook recovers.

M2 — Research and qualification: configure profile and one live research/AI provider, versioned scoring with evidence, durable worker, qualified queue. Gate: fetch failures are recoverable, unknown eligibility stays unresolved, restart resumes, stale results cannot overwrite newer inputs.

M3 — Ready-to-apply packages: official approach routes, grounded resume output, messages/answers, package viewer, download/copy/open actions and user-reported outcomes. Gate: each factual resume claim is supported, documents render correctly, recorded actions update the workbook.

M4 — Release hardening: run one user-supplied ten-lead batch, measure fit accuracy, verify evidence and contacts, inspect accessibility and visual states, test restore, and document startup/provider costs and limits. This is the end of version 1, not an optional phase after release.

Later: additional workflow templates; shared access and permissions; hosted workers; advanced workflow graph editing; optional authorized integrations. Automatic sending/submission is outside version 1.

## 9. Test priority

P0 integrity: stable provenance; nonconsecutive/multiline row identity; duplicate imports; transactional reservations; interrupted run; export retry; external workbook edit; action-state truth; backup restore; unsupported claims; stale result protection.

P1 workflow: qualification branches, missing fields, closed postings, location restrictions, multiple sources, repeated company/different opportunities, qualified queue, artifact versions, deadlines/timezones, provider failures and budget exhaustion.

P2 interface: keyboard navigation, focus management, accessible labels/status contrast, loading/empty/error/retry states, responsive table inspector, document previews and copying/opening destinations.

Use synthetic fixtures in Git. Mock provider tests establish deterministic behavior; separately run a small live smoke test after credentials are configured. No blanket coverage target: prioritize the failure modes above. CI should run typecheck, lint, meaningful tests and production build without private data or live API keys.

## 10. Controlled model routing and usage limits

Use a deterministic application router, not an LLM choosing its own model. Every AI task declares a task class, maximum input/output size, reasoning effort, timeout, retry count, and escalation eligibility. Resolve the logical tier to an explicit, configurable model ID at runtime; never depend on an SDK default. Store the chosen model, reasoning effort, prompt version, token usage, latency, estimated cost, cache status, and escalation reason with every run.

Initial routing policy:

| Work | Default | Escalation |
| --- | --- | --- |
| Column mapping suggestions, field extraction, short summaries and obvious classification | Luna, low | Sol, low only after schema failure or low confidence |
| Vacancy research synthesis, requirement extraction, qualification and evidence comparison | Sol, medium | Astra, medium for conflicting evidence or genuinely ambiguous high-impact decisions |
| Tailored resume, application answers and outreach drafts | Sol, medium | Astra, low/medium only when factual review or complex adaptation fails the quality gate |
| Final groundedness check | Sol, low with a strict evidence schema | Astra, medium only for unresolved contradictions |
| Parsing, IDs, deduplication, dates, state transitions, workbook updates and URL rules | No model | Never |

`Luna`, `Sol`, and `Astra` are logical tiers in application configuration. Start with the current explicit OpenAI IDs `gpt-6-luna`, `gpt-6-sol`, and `gpt-6-astra` only after confirming they are available to the configured API project. Model availability is a setup check, not an assumption. A missing tier falls back to another explicitly configured model with compatible structured-output/tool support; it never silently changes behavior.

Automatic escalation requires a machine-readable reason: invalid structured output after one repair, unresolved contradiction among cited sources, missing mandatory qualification inference, or quality-evaluation failure. Low confidence alone is not permission to spend indefinitely. Maximum two Astra calls per ten-lead batch by default, and never more than one Astra retry for a lead. Users can disable Astra or require manual approval for it.

Default interactive batch limits, configurable by the user:
- 10 leads; at most 30 model calls for the complete batch and at most 4 for one lead.
- One repair attempt for invalid structured output; two network retries with bounded backoff do not count as new semantic attempts.
- Per-stage input and output token caps; pass extracted relevant sections rather than full source pages or complete histories.
- Maximum two concurrent AI calls initially; source fetching has its own bounded concurrency.
- A hard per-batch spend ceiling and optional daily ceiling. Reserve 20% of the batch ceiling for qualified-lead preparation and escalation.
- At 80% of budget, stop optional enrichment. At 100%, checkpoint and pause remaining work without weakening qualification rules.

Cache immutable extraction and assessment results by content hash plus workflow, prompt, profile, model, and criteria versions. Reuse research evidence within its freshness window. Do not pay again for unchanged rejected leads. Keep prompts concise, request minimal structured output, and fetch only the selected evidence needed for a decision.

Use synchronous Responses calls for the user-waiting ten-lead workflow. Consider the Batch API only for overnight re-scoring, backfills, or evaluations where a result within 24 hours is acceptable; it is not the default for instant application preparation. Maintain a representative evaluation set and keep the lightest model/effort that meets the measured quality bar. Compare success per task, unsupported-claim rate, human correction rate, latency, and cost before changing a route.

Official OpenAI guidance used for this policy:
- https://developers.openai.com/api/docs/guides/model-selection
- https://developers.openai.com/api/docs/guides/agents/models
- https://developers.openai.com/api/docs/guides/batch

## 11. Cost and maintenance discipline

Parse and filter deterministically first. Fetch each canonical source once per freshness window. Cache extracted descriptions and profile evidence, keyed by content and version. Use compact structured outputs and explicit evidence references. Reserve stronger reasoning for ambiguous fit and final factual review. Avoid all-agent debates per lead. Record per-stage usage/cost where provided; set configurable batch budget, fetch cap, retries and concurrency. Stop with resumable status when budget is reached; never relax qualification to finish the quota.

Search existing code before every addition. Prefer a narrow working vertical slice over generalized infrastructure. Maintain one schema definition, one state-transition service, one workbook writer, one document renderer, one source tree, and one lockfile.

## 12. Inputs required to run the real pilot

- Actual lead files, including representative uneven source layouts.
- Resume/experience text and factual eligibility/preferences.
- Preferred permanent workbook location or permission to use the app's private data directory.
- Chosen AI/research provider credentials through secure configuration.
- Git remote URL if remote hosting of code is wanted; local version control works without it.

These inputs do not block building the tested foundation with synthetic fixtures. Do not invent them.

## References checked

- Next.js source organization: https://nextjs.org/docs/app/getting-started/project-structure
- Node release lifecycle: https://nodejs.org/en/about/previous-releases
- Available Sites design guidance was consulted for a working-surface-first interface; this plan does not publish a Site or install any design plugin.
