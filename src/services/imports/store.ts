import type { MappedLead } from "@/domain/lead";
import type { RawRow } from "./types";

export interface ImportRecordInput {
  id: string;
  fileName: string;
  fileHash: string;
  fileType: "csv" | "xlsx";
  sheetName: string;
  recordCount: number;
  importedAt: string;
}

export interface LeadInput extends MappedLead {
  id: string;
  identityKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRecordInput {
  id: string;
  importId: string;
  leadId: string;
  sourceSheet: string;
  sourceRow: number;
  raw: RawRow;
  mapped: MappedLead;
  createdAt: string;
}

export interface ImportTransaction {
  createImportIfNew(input: ImportRecordInput): Promise<boolean>;
  getOrCreateLead(input: LeadInput): Promise<{ id: string; created: boolean }>;
  addSourceRecord(input: SourceRecordInput): Promise<void>;
  queueWorkbookExport(createdAt: string): Promise<void>;
}

export interface ImportStore {
  transaction<T>(operation: (transaction: ImportTransaction) => Promise<T>): Promise<T>;
}
