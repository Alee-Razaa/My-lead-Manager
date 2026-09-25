import { describe,it,expect } from "vitest";
import { parseLeadFile } from "./parse";
import { applyMappings } from "./overrides";
describe("manual import mappings",()=>{
  it("remaps uneven headers without changing original rows or raw values",async()=>{
    const file=await parseLeadFile("uneven.csv",Buffer.from("Custom employer,Custom role\nAcme,Engineer"));
    const config=JSON.stringify([{fileHash:file.fileHash,sheets:[{name:"CSV",mapping:[{source:"Custom employer",target:"organization",confidence:"unknown"},{source:"Custom role",target:"opportunity",confidence:"unknown"}]}]}]);
    const result=applyMappings([file],config)[0]!.sheets[0]!.records[0]!;
    expect(result.mapped.organization).toBe("Acme");expect(result.mapped.opportunity).toBe("Engineer");expect(result.raw).toEqual(file.sheets[0]!.records[0]!.raw);expect(result.sourceRow).toBe(2);
  });
  it("rejects competing columns for the same canonical field",async()=>{
    const file=await parseLeadFile("bad.csv",Buffer.from("A,B\nOne,Two"));
    const config=JSON.stringify([{fileHash:file.fileHash,sheets:[{name:"CSV",mapping:[{source:"A",target:"organization",confidence:"unknown"},{source:"B",target:"organization",confidence:"unknown"}]}]}]);
    expect(()=>applyMappings([file],config)).toThrow("only once");
  });
});
