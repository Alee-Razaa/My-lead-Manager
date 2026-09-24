import { describe, expect, it } from "vitest";
import type { ImportStore, LeadInput, SourceRecordInput } from "./store";
import { commitParsedFiles } from "./commit";
import { parseLeadFile } from "./parse";

function memoryStore() {
  const state = {
    imports: new Set<string>(),
    leads: new Map<string, LeadInput>(),
    sources: [] as SourceRecordInput[],
    outbox: 0,
  };
  const store: ImportStore = {
    async transaction(operation) {
      const snapshot = {
        imports: new Set(state.imports),
        leads: new Map(state.leads),
        sources: [...state.sources],
        outbox: state.outbox,
      };
      try {
        return await operation({
          async createImportIfNew(input) {
            const key = `${input.fileHash}|${input.sheetName}`;
            if (state.imports.has(key)) return false;
            state.imports.add(key);
            return true;
          },
          async getOrCreateLead(input) {
            const existing = state.leads.get(input.identityKey);
            if (existing) return { id: existing.id, created: false };
            state.leads.set(input.identityKey, input);
            return { id: input.id, created: true };
          },
          async addSourceRecord(input) {
            state.sources.push(input);
          },
          async queueWorkbookExport() {
            state.outbox += 1;
          },
        });
      } catch (error) {
        state.imports = snapshot.imports;
        state.leads = snapshot.leads;
        state.sources = snapshot.sources;
        state.outbox = snapshot.outbox;
        throw error;
      }
    },
  };
  return { store, state };
}

describe("import commit", () => {
  it("links repeated observations and makes a repeated file idempotent", async () => {
    const memory = memoryStore();
    const first = await parseLeadFile("one.csv", Buffer.from("Company,Role,URL\nAcme,Engineer,https://example.com/job"));
    const second = await parseLeadFile("two.csv", Buffer.from("Employer,Position,Link\nAcme,Engineer,https://example.com/job"));
    await expect(commitParsedFiles(memory.store, [first])).resolves.toMatchObject({ createdLeads: 1, importedRows: 1 });
    await expect(commitParsedFiles(memory.store, [first])).resolves.toMatchObject({ duplicateSheets: 1, importedRows: 0 });
    await expect(commitParsedFiles(memory.store, [second])).resolves.toMatchObject({ createdLeads: 0, linkedDuplicates: 1 });
    expect(memory.state.leads.size).toBe(1);
    expect(memory.state.sources).toHaveLength(2);
    expect(memory.state.outbox).toBe(2);
  });
});
