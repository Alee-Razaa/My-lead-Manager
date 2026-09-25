import { z } from "zod";
import { canonicalFieldSchema } from "@/domain/lead";
import { mapRow } from "./mapping";
import type { ParsedFile } from "./types";
const configSchema = z.array(
  z.object({
    fileHash: z.string(),
    sheets: z.array(
      z.object({
        name: z.string(),
        mapping: z.array(
          z.object({
            source: z.string(),
            target: canonicalFieldSchema.nullable(),
            confidence: z.enum(["exact", "alias", "unknown"]),
          }),
        ),
      }),
    ),
  }),
);
export function applyMappings(files: ParsedFile[], config: string | null) {
  if (!config) return files;
  const parsed = configSchema.parse(JSON.parse(config));
  return files.map((file) => ({
    ...file,
    sheets: file.sheets.map((sheet) => {
      const mapping = parsed
        .find((f) => f.fileHash === file.fileHash)
        ?.sheets.find((s) => s.name === sheet.name)?.mapping;
      if (!mapping) return sheet;
      if (mapping.some((m) => !sheet.headers.includes(m.source)))
        throw new Error("Mapping contains an unknown source column.");
      const targets = mapping.flatMap((m) => (m.target ? [m.target] : []));
      if (new Set(targets).size !== targets.length)
        throw new Error("Map each target field only once per sheet.");
      return {
        ...sheet,
        mapping,
        records: sheet.records.map((record) => ({
          ...record,
          mapped: mapRow(record.raw, mapping),
        })),
      };
    }),
  }));
}
