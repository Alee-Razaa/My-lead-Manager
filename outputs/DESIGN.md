# Lead Workspace — premium working-interface contract

This is a project-specific design guide loaded by AGENTS.md, not a claim that a third-party premium design skill has been installed. Reuse the available Sites design guidance when applicable during actual UI implementation. Read this guide before building or reviewing a screen.

## Visual direction

Quiet, precise editorial workspace. Warm off-white canvas (#F6F5F1), white working panels, deep graphite text (#202521), forest-green primary accent (#245A45). Reserve amber for unresolved work, red for failures, and muted neutral for rejected records. Confirm accessible contrast before shipping; never encode status solely through color. Avoid gradients, glass panels, decorative dashboards, oversized hero sections, and excessive rounded cards.

Use a consistent sans-serif font stack, restrained weights, clear hierarchy, and tabular numerals in counts. Define spacing, color, typography, radius, border and focus tokens once. Prefer thin separators and well-aligned columns to repeated card containers. Icons supplement text and use one consistent library.

## Application shell

- Left rail: product name, Imports, Batches, Qualified, Ready, Activity, Settings.
- Header: current batch, exact selected count, progress, and workbook synchronization status.
- Stage strip: Import, Research, Qualify, Enrich, Prepare, Ready. Each is navigable and shows actual counts/status.
- Center: useful table or focused work results immediately visible.
- Right inspector: selected lead, source provenance, evidence, decisions, artifacts and scoped AI instructions.

At laptop widths, keep the working table usable and make the inspector collapsible. On narrow screens show list/detail navigation rather than compressing every column. Preserve filters and selection when switching stages.

## High-value interactions

Import preview shows file names, sheet selection, mapping confidence, missing fields, duplicates, and original row references before committing. Never disguise an import ambiguity as a successful result.

Batch selection shows an exact manifest, not just '10 leads'. Distinguish research progress from workbook save progress. Failed members show a short cause and retry action without blocking inspection of completed leads.

Qualification view gives decision, evidence, missing requirements and override with a reason. Rejected records remain searchable. Manual overrides must be identified in history.

Ready view prioritizes one recommended next action, its destination, downloadable files, and copyable text. Secondary approach methods appear beneath it. 'Mark applied' and 'Mark sent' are explicit user actions, never automatic side effects of opening a link or copying a draft.

AI results show sources and proposed changes. A selected lead/batch badge makes scope visible before an instruction is run. Provide cancel, retry and stale-output notices. Long research runs must not freeze navigation.

## Quality gate

Check empty, populated, loading, partial, blocked, error and completed states. Verify keyboard use, visible focus, modal focus return, screen-reader labels, reduced-motion behavior and readable status text. Destructive actions require an appropriate confirmation and recoverability. Validate both a dense ten-record batch and a long description. Use real domain labels and clearly marked synthetic preview records; never make up live completed research for a screenshot.

Premium means reliable, legible and finished. Every visible control must work or be explicitly unavailable with a reason. Charts and decorative metrics are not needed for version 1.
