import type { CanonicalField, MappedLead } from "@/domain/lead";

export type RawCell = string | number | boolean | null;
export type RawRow = Record<string, RawCell>;

export interface ColumnMapping {
  source: string;
  target: CanonicalField | null;
  confidence: "exact" | "alias" | "unknown";
}

export interface ParsedRecord {
  sourceRow: number;
  raw: RawRow;
  mapped: MappedLead;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  mapping: ColumnMapping[];
  records: ParsedRecord[];
  warnings: string[];
}

export interface ParsedFile {
  fileName: string;
  fileHash: string;
  fileType: "csv" | "xlsx";
  sheets: ParsedSheet[];
}
