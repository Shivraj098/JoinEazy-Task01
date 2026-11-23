import { describe, expect, it } from "vitest";
import { summarizeGroupAssignmentProgress } from "../src/modules/admin-monitoring/admin-monitoring.metrics.js";

describe("admin monitoring metrics", () => {
  it("counts completed-late pairs as completed", () => {
    const summary = summarizeGroupAssignmentProgress([
      { status: "COMPLETED" },
      { status: "COMPLETED_LATE" },
      { status: "OVERDUE" },
      { status: "IN_PROGRESS" },
      { status: "PENDING" },
    ]);

    expect(summary).toMatchObject({
      eligibleGroupAssignmentPairs: 5,
      completedGroupAssignmentPairs: 2,
      overdueGroupAssignmentPairs: 1,
      overallCompletionPercentage: 40,
      statusBreakdown: {
        PENDING: 1,
        IN_PROGRESS: 1,
        OVERDUE: 1,
        COMPLETED: 1,
        COMPLETED_LATE: 1,
      },
    });
  });

  it("returns zero percent when there are no eligible pairs", () => {
    expect(summarizeGroupAssignmentProgress([])).toMatchObject({
      eligibleGroupAssignmentPairs: 0,
      completedGroupAssignmentPairs: 0,
      overdueGroupAssignmentPairs: 0,
      overallCompletionPercentage: 0,
    });
  });
});
