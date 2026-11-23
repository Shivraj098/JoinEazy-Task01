import type { GroupAssignmentProgress, GroupAssignmentStatus } from "../submissions/progress.service.js";

export const GROUP_ASSIGNMENT_STATUSES: GroupAssignmentStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "OVERDUE",
  "COMPLETED",
  "COMPLETED_LATE",
];

export interface GroupAssignmentSummary {
  eligibleGroupAssignmentPairs: number;
  completedGroupAssignmentPairs: number;
  overdueGroupAssignmentPairs: number;
  overallCompletionPercentage: number;
  statusBreakdown: Record<GroupAssignmentStatus, number>;
}

/**
 * The denominator is the number of eligible group-assignment pairs in the current
 * monitoring result. Completed includes both on-time and late completion.
 */
export function summarizeGroupAssignmentProgress(
  progress: Pick<GroupAssignmentProgress, "status">[],
): GroupAssignmentSummary {
  const statusBreakdown = Object.fromEntries(
    GROUP_ASSIGNMENT_STATUSES.map((status) => [status, 0]),
  ) as Record<GroupAssignmentStatus, number>;

  for (const item of progress) statusBreakdown[item.status] += 1;

  const eligibleGroupAssignmentPairs = progress.length;
  const completedGroupAssignmentPairs =
    statusBreakdown.COMPLETED + statusBreakdown.COMPLETED_LATE;
  const overdueGroupAssignmentPairs = statusBreakdown.OVERDUE;

  return {
    eligibleGroupAssignmentPairs,
    completedGroupAssignmentPairs,
    overdueGroupAssignmentPairs,
    overallCompletionPercentage:
      eligibleGroupAssignmentPairs === 0
        ? 0
        : Math.round((completedGroupAssignmentPairs / eligibleGroupAssignmentPairs) * 100),
    statusBreakdown,
  };
}
