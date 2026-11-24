import { describe, expect, it } from "vitest";
import {
  addGroupMemberSchema,
  createGroupSchema,
  studentSearchSchema,
} from "../src/modules/groups/groups.schemas.js";

describe("group input schemas", () => {
  it("trims and validates group names", () => {
    expect(createGroupSchema.parse({ name: "  Project Alpha  " }).name).toBe("Project Alpha");
    expect(createGroupSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("requires a searchable student identifier", () => {
    expect(addGroupMemberSchema.safeParse({ identifier: "student@example.com" }).success).toBe(
      true,
    );
    expect(addGroupMemberSchema.safeParse({ identifier: " " }).success).toBe(false);
  });

  it("requires at least two characters for student search", () => {
    expect(studentSearchSchema.safeParse({ q: "ab" }).success).toBe(true);
    expect(studentSearchSchema.safeParse({ q: "a" }).success).toBe(false);
  });
});
