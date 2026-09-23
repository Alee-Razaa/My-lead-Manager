import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { migrate } from "@/adapters/database/database";
import { commitParsedFiles } from "./commit";
import { parseLeadFile } from "./parse";

describe("import commit", () => {
  it("links repeated observations and makes a repeated file idempotent", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    migrate(database);
    const first = await parseLeadFile("one.csv", Buffer.from("Company,Role,URL\nAcme,Engineer,https://example.com/job"));
    const second = await parseLeadFile("two.csv", Buffer.from("Employer,Position,Link\nAcme,Engineer,https://example.com/job"));
    expect(commitParsedFiles(database, [first])).toMatchObject({ createdLeads: 1, importedRows: 1 });
    expect(commitParsedFiles(database, [first])).toMatchObject({ duplicateSheets: 1, importedRows: 0 });
    expect(commitParsedFiles(database, [second])).toMatchObject({ createdLeads: 0, linkedDuplicates: 1 });
    expect((database.prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number }).count).toBe(1);
    expect((database.prepare("SELECT COUNT(*) AS count FROM source_records").get() as { count: number }).count).toBe(2);
  });
});
