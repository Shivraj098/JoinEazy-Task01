import { describe, expect, it } from "vitest";
import { adminMonitoringQuerySchema } from "../src/modules/admin-monitoring/admin-monitoring.schemas.js";

describe("admin monitoring query", () => {
  it("accepts an empty filter", () => {
    expect(adminMonitoringQuerySchema.parse({})).toEqual({});
  });

  it("accepts an assignment and status filter", () => {
    const assignmentId = "a3a5d1a8-2ed4-45b3-8b17-90e30e2ee76e";
    expect(adminMonitoringQuerySchema.parse({ assignmentId, status: "OVERDUE" })).toEqual({
      assignmentId,
      status: "OVERDUE",
    });
  });

  it("rejects an unknown status", () => {
    expect(() => adminMonitoringQuerySchema.parse({ status: "LATE" })).toThrow();
  });

  it("rejects malformed assignment identifiers", () => {
    expect(() => adminMonitoringQuerySchema.parse({ assignmentId: "not-a-uuid" })).toThrow();
  });
});
