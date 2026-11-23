import { describe, expect, it } from "vitest";
import { deriveGroupAssignmentStatus } from "../src/modules/submissions/progress.service.js";

const dueAt = new Date("2026-11-24T10:00:00.000Z");
const beforeDue = new Date("2026-11-24T09:00:00.000Z");
const afterDue = new Date("2026-11-24T11:00:00.000Z");

describe("group assignment status", () => {
  it("is pending before any member confirms", () => {
    expect(deriveGroupAssignmentStatus(0, 3, dueAt, null, beforeDue)).toBe("PENDING");
  });

  it("is in progress when some members have confirmed before the deadline", () => {
    expect(deriveGroupAssignmentStatus(1, 3, dueAt, beforeDue, beforeDue)).toBe("IN_PROGRESS");
  });

  it("is overdue while at least one member remains unconfirmed after the deadline", () => {
    expect(deriveGroupAssignmentStatus(2, 3, dueAt, afterDue, afterDue)).toBe("OVERDUE");
  });

  it("is completed when the final confirmation is on or before the deadline", () => {
    expect(deriveGroupAssignmentStatus(3, 3, dueAt, dueAt, afterDue)).toBe("COMPLETED");
  });

  it("is completed late when all members confirm after the deadline", () => {
    expect(deriveGroupAssignmentStatus(3, 3, dueAt, afterDue, afterDue)).toBe("COMPLETED_LATE");
  });

  it("does not classify an empty group as completed", () => {
    expect(deriveGroupAssignmentStatus(0, 0, dueAt, null, beforeDue)).toBe("PENDING");
  });
});
