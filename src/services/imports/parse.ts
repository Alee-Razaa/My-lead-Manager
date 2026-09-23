import { createHash } from "node:crypto";
import Papa from "papaparse";
import { suggestMappings, mapRow } from "./mapping";
import type { ParsedFile, ParsedSheet, RawCell, RawRow } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function hash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function uniqueHeaders(values: unknown[]): string[] {
  const seen = new Map<string, number>();
  return values.map((value, index) => {
    const base = String(value ?? "").trim() || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function normalizeCell(value: unknown): RawCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

type MatrixRow = { sourceRow: number; values: unknown[] };

function buildSheet(name: string, matrix: MatrixRow[]): ParsedSheet {
  const nonBlank = matrix.filter((row) => row.values.some((cell) => String(cell ?? "").trim() !== ""));
  if (nonBlank.length === 0) return { name, headers: [], mapping: [], records: [], warnings: ["Sheet is empty."] };
  const headers = uniqueHeaders(nonBlank[0]?.values ?? []);
  const mapping = suggestMappings(headers);
  const records = nonBlank.slice(1).map(({ sourceRow, values }) => {
    const raw: RawRow = {};
    headers.forEach((header, column) => { raw[header] = normalizeCell(values[column]); });
    return { sourceRow, raw, mapped: mapRow(raw, mapping) };
  });
  return { name, headers, mapping, records, warnings: [] };
}

async function parseWorkbook(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheets: ParsedSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const matrix: MatrixRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push({ sourceRow: row.number, values });
    });
    sheets.push(buildSheet(worksheet.name, matrix));
  });
  return { fileName, fileHash: hash(buffer), fileType: "xlsx", sheets };
}

function parseCsv(fileName: string, buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const matrix = (result.data as unknown[][]).map((values, index) => ({ sourceRow: index + 1, values }));
  const sheet = buildSheet("CSV", matrix);
  sheet.warnings.push(...result.errors.map((error) => `CSV row ${error.row ?? "?"}: ${error.message}`));
  return { fileName, fileHash: hash(buffer), fileType: "csv", sheets: [sheet] };
}

export async function parseLeadFile(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  if (buffer.byteLength === 0) throw new Error(`${fileName} is empty.`);
  if (buffer.byteLength > MAX_FILE_BYTES) throw new Error(`${fileName} exceeds the 10 MB limit.`);
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsv(fileName, buffer);
  if (extension === "xlsx") return parseWorkbook(fileName, buffer);
  throw new Error(`${fileName} is not a supported CSV or XLSX file.`);
}
