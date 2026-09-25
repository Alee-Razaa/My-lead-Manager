import ExcelJS from "exceljs";
import type { Snapshot } from "@/domain/workspace";

export async function exportWorkbook(data: Snapshot) {
  const book = new ExcelJS.Workbook();
  book.creator = "Lead Workspace";
  book.created = new Date();
  function sheet(name: string, rows: object[], fallback: string[]) {
    const ws = book.addWorksheet(name);
    const keys = rows.length ? Object.keys(rows[0]!) : fallback;
    ws.columns = keys.map((key) => ({
      header: key,
      key,
      width: key.includes("id") ? 38 : 26,
    }));
    for (const row of rows) {
      const value: Record<string, string | number | boolean> = {};
      for (const [key, cell] of Object.entries(row)) {
        const text =
          cell instanceof Date
            ? cell.toISOString()
            : typeof cell === "object" && cell !== null
              ? JSON.stringify(cell)
              : (cell ?? "");
        // Strings are literal XLSX cells, never formula objects.
        if (String(text).length > 32767)
          throw new Error(
            "A field is too long for Excel. Download the JSON backup to preserve it in full.",
          );
        value[key] = text;
      }
      ws.addRow(value);
    }
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, ws.rowCount), column: keys.length },
    };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF245A45" },
    };
    ws.getRow(1).height = 25;
    ws.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
  }
  sheet("Master_Leads", data.leads, [
    "id",
    "organization",
    "opportunity",
    "assessment",
  ]);
  sheet(
    "Qualified_Queue",
    data.leads.filter((l) => l.assessment === "qualified"),
    ["id", "organization", "opportunity", "execution_state"],
  );
  sheet("Activity_Tracker", data.activities, [
    "id",
    "lead_id",
    "action_type",
    "destination",
    "notes",
    "occurred_at",
  ]);
  sheet("Source_Records", data.sources, [
    "id",
    "lead_id",
    "file_name",
    "source_sheet",
    "source_row",
    "raw_json",
  ]);
  sheet(
    "Batches",
    data.members.map((m) => ({
      ...m,
      created_at:
        data.batches.find((b) => b.id === m.batch_id)?.created_at ?? "",
      original_rows: data.sources
        .filter((s) => s.lead_id === m.lead_id)
        .map((s) => `${s.file_name} / ${s.source_sheet} / ${s.source_row}`)
        .join("; "),
    })),
    ["batch_id", "lead_id", "ordinal", "stage", "original_rows"],
  );
  sheet(
    "Research_Evidence",
    data.leads
      .filter((l) => l.evidence)
      .map((l) => ({
        lead_id: l.id,
        evidence: l.evidence,
        approach_url: l.approach_url,
        updated_at: l.updated_at,
        verification: "User-entered; not independently verified",
      })),
    ["lead_id", "evidence", "approach_url", "updated_at", "verification"],
  );
  sheet("Decision_History", data.decisions, [
    "id",
    "lead_id",
    "previous_decision",
    "decision",
    "rationale",
    "version",
    "occurred_at",
  ]);
  sheet(
    "Export_Info",
    [
      {
        revision: data.revision,
        exported_at: new Date().toISOString(),
        mode: "Downloaded snapshot. Re-download after changes; external Excel edits are not synchronized.",
        profile: data.settings.profile,
        criteria: data.settings.criteria,
      },
    ],
    ["revision"],
  );
  return book.xlsx.writeBuffer();
}
