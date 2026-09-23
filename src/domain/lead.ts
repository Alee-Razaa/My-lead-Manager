import { z } from "zod";

export const canonicalFieldSchema = z.enum([
  "organization",
  "opportunity",
  "location",
  "source_url",
  "contact_name",
  "email",
  "phone",
  "description",
  "posted_at",
]);

export type CanonicalField = z.infer<typeof canonicalFieldSchema>;

export const assessmentSchema = z.enum([
  "unassessed",
  "qualified",
  "rejected",
  "needs_information",
]);

export const executionStateSchema = z.enum([
  "queued",
  "researching",
  "qualifying",
  "enriching",
  "preparing",
  "ready",
  "blocked",
  "completed",
]);

export const actionStateSchema = z.enum([
  "not_actioned",
  "applied",
  "email_sent",
  "whatsapp_sent",
  "other_contact",
  "replied",
  "closed",
]);

export const mappedLeadSchema = z.object({
  organization: z.string().default(""),
  opportunity: z.string().default(""),
  location: z.string().default(""),
  source_url: z.string().default(""),
  contact_name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  description: z.string().default(""),
  posted_at: z.string().default(""),
});

export type MappedLead = z.infer<typeof mappedLeadSchema>;
