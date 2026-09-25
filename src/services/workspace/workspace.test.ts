import { describe, it, expect } from "vitest";
import {
  validateReadiness,
  workspaceCommand,
  safeLink,
  type Snapshot,
} from "@/domain/workspace";
import { issueSession, validSession } from "@/services/auth/session";
import { exportWorkbook } from "@/adapters/workbook/export";
import ExcelJS from "exceljs";

describe("manual workflow integrity", () => {
  it("rejects readiness without qualified evidence and destination", () => {
    expect(
      validateReadiness({
        assessment: "unassessed",
        execution_state: "ready",
        rationale: "",
        approach_url: "",
        evidence: "",
      }),
    ).toBeTruthy();
    expect(
      validateReadiness({
        assessment: "qualified",
        execution_state: "ready",
        rationale: "Eligible",
        approach_url: "https://example.com/apply",
        evidence: "Checked official source today",
      }),
    ).toBeUndefined();
    expect(safeLink("javascript:alert(1)")).toBeUndefined();
  });
  it("requires explicit user confirmation and unique batch members", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      workspaceCommand.safeParse({ type: "batch", ids: [id, id] }).success,
    ).toBe(false);
    expect(
      workspaceCommand.safeParse({
        type: "activity",
        id,
        lead_id: id,
        action_type: "applied",
        destination: "",
        notes: "",
        confirmed: false,
      }).success,
    ).toBe(false);
  });
  it("rejects forged and expired sessions", () => {
    const token = issueSession("a-secret", 1000);
    expect(validSession(token, "a-secret", 2000)).toBe(true);
    expect(validSession(token, "wrong-secret", 2000)).toBe(false);
    expect(validSession(token, "a-secret", 1000 + 604800000)).toBe(false);
  });
  it("exports source values literally and includes all record sheets", async () => {
    const data: Snapshot = {
      leads: [],
      sources: [
        {
          id: "s",
          lead_id: "l",
          file_name: "test.csv",
          file_type: "csv",
          source_sheet: "CSV",
          source_row: 4,
          raw_json: { Company: '=HYPERLINK("https://example.com")' },
          mapped_json: {},
        },
      ],
      batches: [],
      members: [],
      activities: [],
      decisions: [],
      settings: { profile: "", criteria: "" },
      revision: "9",
    };
    const buffer = await exportWorkbook(data);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(book.worksheets.map((s) => s.name)).toContain("Decision_History");
    expect(book.worksheets).toHaveLength(8);
    expect(book.getWorksheet("Source_Records")!.getCell("H2").type).not.toBe(
      ExcelJS.ValueType.Formula,
    );
    expect(
      JSON.stringify(book.getWorksheet("Source_Records")!.getRow(2).values),
    ).toContain("HYPERLINK");
    expect(book.getWorksheet("Export_Info")!.getCell("A2").value).toBe("9");
  });
});
