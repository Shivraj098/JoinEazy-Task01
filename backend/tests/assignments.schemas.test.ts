import { describe, expect, it } from "vitest";
import { createAssignmentSchema } from "../src/modules/assignments/assignments.schemas.js";

const valid = {
  title: "Database systems assignment",
  description: "Design and document a normalized relational schema.",
  dueAt: "2026-11-24T10:00:00.000Z",
  oneDriveUrl: "https://1drv.ms/f/example",
  targetType: "ALL_STUDENTS" as const,
  groupIds: [],
};

describe("assignment input schema", () => {
  it("accepts an all-student assignment with an HTTPS OneDrive link", () => {
    expect(createAssignmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-HTTPS submission links", () => {
    expect(createAssignmentSchema.safeParse({ ...valid, oneDriveUrl: "http://example.com/upload" }).success).toBe(false);
  });

  it("requires at least one group for selected-group assignments", () => {
    expect(createAssignmentSchema.safeParse({ ...valid, targetType: "SELECTED_GROUPS" }).success).toBe(false);
  });

  it("rejects duplicate group IDs", () => {
    const groupId = "11111111-1111-4111-8111-111111111111";
    expect(createAssignmentSchema.safeParse({ ...valid, targetType: "SELECTED_GROUPS", groupIds: [groupId, groupId] }).success).toBe(false);
  });

  it("does not allow group IDs for all-student assignments", () => {
    const groupId = "11111111-1111-4111-8111-111111111111";
    expect(createAssignmentSchema.safeParse({ ...valid, groupIds: [groupId] }).success).toBe(false);
  });
});
