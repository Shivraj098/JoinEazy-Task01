import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeStudentId } from "../src/utils/normalize.js";

describe("normalization", () => {
  it("trims and lowercases email", () => {
    expect(normalizeEmail("  Aarav@Example.COM ")).toBe("aarav@example.com");
  });

  it("trims and uppercases student IDs", () => {
    expect(normalizeStudentId(" stu-1001 ")).toBe("STU-1001");
  });
});
