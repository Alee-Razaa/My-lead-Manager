import { describe, expect, it } from "vitest";
import { parseLeadFile } from "./parse";

describe("lead file parser", () => {
  it("preserves quoted multiline CSV records and logical source rows", async () => {
    const input = Buffer.from('Company,Role,Notes,URL\nAcme,Engineer,"Line one\nLine two",https://example.com/a\n,,,\nBeta,Analyst,,https://example.com/b');
    const parsed = await parseLeadFile("leads.csv", input);
    const sheet = parsed.sheets[0];
    expect(sheet?.records).toHaveLength(2);
    expect(sheet?.records[0]?.sourceRow).toBe(2);
    expect(sheet?.records[0]?.raw.Notes).toBe("Line one\nLine two");
    expect(sheet?.records[1]?.sourceRow).toBe(4);
  });

  it("preserves XLSX sheet names and physical row numbers", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Research team");
    sheet.addRow(["Business", "Opportunity"]);
    sheet.getRow(4).values = ["Acme", "Partnership"];
    const bytes = await workbook.xlsx.writeBuffer();
    const parsed = await parseLeadFile("leads.xlsx", Buffer.from(bytes));
    expect(parsed.sheets[0]?.name).toBe("Research team");
    expect(parsed.sheets[0]?.records[0]?.sourceRow).toBe(4);
    expect(parsed.sheets[0]?.records[0]?.mapped.organization).toBe("Acme");
  });

  it("rejects unsupported file types", async () => {
    await expect(parseLeadFile("leads.txt", Buffer.from("hello"))).rejects.toThrow("not a supported");
  });
});
