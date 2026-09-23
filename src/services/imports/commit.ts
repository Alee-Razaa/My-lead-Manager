import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { MappedLead } from "@/domain/lead";
import type { ParsedFile } from "./types";

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function identityKey(lead: MappedLead, fallback: string): string {
  const direct = normalized(lead.source_url);
  const composite = [lead.organization, lead.opportunity, lead.location].map(normalized).join("|");
  const basis = direct || (composite.replace(/\|/g, "") ? composite : fallback);
  return createHash("sha256").update(basis).digest("hex");
}

export interface CommitSummary {
  importedSheets: number;
  importedRows: number;
  createdLeads: number;
  linkedDuplicates: number;
  duplicateSheets: number;
}

export function commitParsedFiles(database: DatabaseSync, files: ParsedFile[]): CommitSummary {
  const summary: CommitSummary = { importedSheets: 0, importedRows: 0, createdLeads: 0, linkedDuplicates: 0, duplicateSheets: 0 };
  const now = new Date().toISOString();
  const existingImport = database.prepare("SELECT id FROM imports WHERE file_hash = ? AND sheet_name = ?");
  const existingLead = database.prepare("SELECT id FROM leads WHERE identity_key = ?");
  const insertImport = database.prepare(`INSERT INTO imports(id,file_name,file_hash,file_type,sheet_name,record_count,imported_at) VALUES (?,?,?,?,?,?,?)`);
  const insertLead = database.prepare(`INSERT INTO leads(id,identity_key,organization,opportunity,location,source_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`);
  const insertSource = database.prepare(`INSERT INTO source_records(id,import_id,lead_id,source_sheet,source_row,raw_json,mapped_json,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  const outbox = database.prepare("INSERT INTO export_outbox(status,created_at) VALUES ('pending',?)");

  database.exec("BEGIN IMMEDIATE");
  try {
    for (const file of files) {
      for (const sheet of file.sheets) {
        if (existingImport.get(file.fileHash, sheet.name)) {
          summary.duplicateSheets += 1;
          continue;
        }
        const importId = randomUUID();
        insertImport.run(importId, file.fileName, file.fileHash, file.fileType, sheet.name, sheet.records.length, now);
        summary.importedSheets += 1;
        for (const record of sheet.records) {
          const key = identityKey(record.mapped, `${file.fileHash}|${sheet.name}|${record.sourceRow}`);
          const found = existingLead.get(key) as { id: string } | undefined;
          let leadId = found?.id;
          if (!leadId) {
            leadId = randomUUID();
            insertLead.run(
              leadId,
              key,
              record.mapped.organization,
              record.mapped.opportunity,
              record.mapped.location,
              record.mapped.source_url,
              now,
              now,
            );
            summary.createdLeads += 1;
          } else {
            summary.linkedDuplicates += 1;
          }
          insertSource.run(randomUUID(), importId, leadId, sheet.name, record.sourceRow, JSON.stringify(record.raw), JSON.stringify(record.mapped), now);
          summary.importedRows += 1;
        }
      }
    }
    if (summary.importedRows > 0) outbox.run(now);
    database.exec("COMMIT");
    return summary;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
