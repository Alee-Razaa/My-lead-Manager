import { describe, expect, it } from "vitest";
import { normalizeHeader, suggestMappings } from "./mapping";

describe("column mapping", () => {
  it("normalizes common separators and whitespace", () => {
    expect(normalizeHeader("  Job_Title  ")).toBe("job title");
  });

  it("does not map two source columns to the same canonical field", () => {
    const mapping = suggestMappings(["Company", "Employer", "Role", "Mystery"]);
    expect(mapping.map((item) => item.target)).toEqual(["organization", null, "opportunity", null]);
  });
});
