import { z } from "zod";
import {
  assessmentSchema,
  executionStateSchema,
  actionStateSchema,
} from "./lead";

export function safeLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
const short = z.string().max(2000);
const long = z.string().max(20000);
export const workspaceCommand = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("batch"),
    ids: z
      .array(z.string().uuid())
      .min(1)
      .max(10)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose distinct leads.",
      ),
  }),
  z.object({
    type: z.literal("lead"),
    id: z.string().uuid(),
    version: z.number().int().positive(),
    assessment: assessmentSchema,
    execution_state: executionStateSchema,
    notes: long,
    rationale: long,
    approach_url: short.refine(
      (v) => !v || !!safeLink(v),
      "Use a valid http, https or mailto address.",
    ),
    draft: long,
    evidence: long,
  }),
  z.object({
    type: z.literal("activity"),
    id: z.string().uuid(),
    lead_id: z.string().uuid(),
    action_type: actionStateSchema.exclude(["not_actioned"]),
    destination: short,
    notes: long,
    confirmed: z.literal(true),
  }),
  z.object({ type: z.literal("settings"), profile: long, criteria: long }),
]);
export type WorkspaceCommand = z.infer<typeof workspaceCommand>;
export interface Lead {
  id: string;
  organization: string;
  opportunity: string;
  location: string;
  source_url: string;
  assessment: z.infer<typeof assessmentSchema>;
  execution_state: z.infer<typeof executionStateSchema>;
  action_state: z.infer<typeof actionStateSchema>;
  notes: string;
  rationale: string;
  approach_url: string;
  draft: string;
  evidence: string;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface Source {
  id: string;
  lead_id: string;
  file_name: string;
  file_type: string;
  source_sheet: string;
  source_row: number;
  raw_json: Record<string, unknown>;
  mapped_json: Record<string, unknown>;
}
export interface Batch {
  id: string;
  created_at: string;
  status: string;
}
export interface Member {
  batch_id: string;
  lead_id: string;
  ordinal: number;
  stage: string;
}
export interface Activity {
  id: string;
  lead_id: string;
  action_type: string;
  destination: string;
  notes: string;
  occurred_at: string;
}
export interface Decision {
  id: string;
  lead_id: string;
  previous_decision: string;
  decision: string;
  rationale: string;
  version: number;
  occurred_at: string;
}
export interface Snapshot {
  leads: Lead[];
  sources: Source[];
  batches: Batch[];
  members: Member[];
  activities: Activity[];
  decisions: Decision[];
  settings: { profile: string; criteria: string };
  revision: string;
}
export function validateReadiness(
  input: Pick<
    Lead,
    "assessment" | "execution_state" | "rationale" | "approach_url" | "evidence"
  >,
): string | undefined {
  if (input.assessment !== "unassessed" && !input.rationale.trim())
    return "Add a reason for your decision.";
  if (
    ["ready", "completed"].includes(input.execution_state) &&
    (input.assessment !== "qualified" ||
      !safeLink(input.approach_url) ||
      !input.evidence.trim())
  )
    return "Ready requires a qualified decision, an approach link and research evidence.";
}
