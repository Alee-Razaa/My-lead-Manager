import { z } from "zod";

export const modelTierSchema = z.enum(["none", "luna", "sol", "astra"]);
export type ModelTier = z.infer<typeof modelTierSchema>;

export const taskClassSchema = z.enum([
  "column_mapping",
  "field_extraction",
  "research_synthesis",
  "qualification",
  "application_draft",
  "groundedness_check",
]);

export type TaskClass = z.infer<typeof taskClassSchema>;

export const MODEL_POLICY: Record<TaskClass, { tier: ModelTier; effort: "low" | "medium" }> = {
  column_mapping: { tier: "luna", effort: "low" },
  field_extraction: { tier: "luna", effort: "low" },
  research_synthesis: { tier: "sol", effort: "medium" },
  qualification: { tier: "sol", effort: "medium" },
  application_draft: { tier: "sol", effort: "medium" },
  groundedness_check: { tier: "sol", effort: "low" },
};

export const DEFAULT_USAGE_LIMITS = Object.freeze({
  batchSize: 10,
  maxCallsPerBatch: 30,
  maxCallsPerLead: 4,
  maxAstraCallsPerBatch: 2,
  concurrency: 2,
  stopOptionalAtBudgetFraction: 0.8,
});
