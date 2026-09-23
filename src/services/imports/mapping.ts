import type { CanonicalField, MappedLead } from "@/domain/lead";
import { mappedLeadSchema } from "@/domain/lead";
import type { ColumnMapping, RawRow } from "./types";

const aliases: Record<CanonicalField, string[]> = {
  organization: ["organization", "company", "business", "employer", "client"],
  opportunity: ["opportunity", "job", "job title", "role", "position", "vacancy", "lead"],
  location: ["location", "city", "region", "country", "job location"],
  source_url: ["source url", "url", "link", "job url", "apply link", "website"],
  contact_name: ["contact name", "contact", "person", "recruiter", "hiring manager"],
  email: ["email", "email address", "contact email"],
  phone: ["phone", "phone number", "mobile", "whatsapp", "contact number"],
  description: ["description", "details", "notes", "job description", "comments"],
  posted_at: ["posted at", "posting date", "date posted", "published at", "date"],
};

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function suggestMappings(headers: string[]): ColumnMapping[] {
  const claimed = new Set<CanonicalField>();
  return headers.map((source) => {
    const normalized = normalizeHeader(source);
    const exact = (Object.keys(aliases) as CanonicalField[]).find((field) => field === normalized);
    const alias = (Object.keys(aliases) as CanonicalField[]).find(
      (field) => aliases[field].includes(normalized) && !claimed.has(field),
    );
    const target = exact && !claimed.has(exact) ? exact : alias ?? null;
    if (target) claimed.add(target);
    return { source, target, confidence: exact === target ? "exact" : target ? "alias" : "unknown" };
  });
}

function cellToString(value: RawRow[string] | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function mapRow(row: RawRow, mapping: ColumnMapping[]): MappedLead {
  const candidate: Partial<MappedLead> = {};
  for (const item of mapping) {
    if (item.target) candidate[item.target] = cellToString(row[item.source]);
  }
  return mappedLeadSchema.parse(candidate);
}
