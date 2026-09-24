import { createHash, randomUUID } from "node:crypto";
import type { MappedLead } from "@/domain/lead";
import type { ImportStore } from "./store";
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

export async function commitParsedFiles(store: ImportStore, files: ParsedFile[]): Promise<CommitSummary> {
  const summary: CommitSummary = { importedSheets: 0, importedRows: 0, createdLeads: 0, linkedDuplicates: 0, duplicateSheets: 0 };
  const now = new Date().toISOString();
  return store.transaction(async (transaction) => {
    for (const file of files) {
      for (const sheet of file.sheets) {
        const importId = randomUUID();
        const createdImport = await transaction.createImportIfNew({
          id: importId,
          fileName: file.fileName,
          fileHash: file.fileHash,
          fileType: file.fileType,
          sheetName: sheet.name,
          recordCount: sheet.records.length,
          importedAt: now,
        });
        if (!createdImport) {
          summary.duplicateSheets += 1;
          continue;
        }
        summary.importedSheets += 1;
        for (const record of sheet.records) {
          const key = identityKey(record.mapped, `${file.fileHash}|${sheet.name}|${record.sourceRow}`);
          const lead = await transaction.getOrCreateLead({
            id: randomUUID(),
            identityKey: key,
            ...record.mapped,
            createdAt: now,
            updatedAt: now,
          });
          if (lead.created) summary.createdLeads += 1;
          else summary.linkedDuplicates += 1;
          await transaction.addSourceRecord({
            id: randomUUID(),
            importId,
            leadId: lead.id,
            sourceSheet: sheet.name,
            sourceRow: record.sourceRow,
            raw: record.raw,
            mapped: record.mapped,
            createdAt: now,
          });
          summary.importedRows += 1;
        }
      }
    }
    if (summary.importedRows > 0) await transaction.queueWorkbookExport(now);
    return summary;
  });
}
