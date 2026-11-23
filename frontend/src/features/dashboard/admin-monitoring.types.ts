import type { GroupAssignmentProgress, GroupAssignmentStatus } from "../assignments/types";

export interface AdminOverview {
  summary: {
    studentCount: number;
    ungroupedStudentCount: number;
    groupCount: number;
    assignmentCount: number;
    eligibleGroupAssignmentPairs: number;
    completedGroupAssignmentPairs: number;
    overdueGroupAssignmentPairs: number;
    overallCompletionPercentage: number;
    statusBreakdown: Record<GroupAssignmentStatus, number>;
  };
  assignments: Array<{ id: string; title: string }>;
}

export interface AdminMonitoringAssignment {
  id: string;
  title: string;
  dueAt: string;
  targetType: "ALL_STUDENTS" | "SELECTED_GROUPS";
  groups: Array<{
    id: string;
    name: string;
    progress: GroupAssignmentProgress;
  }>;
}

export interface AdminMonitoringResponse {
  assignments: AdminMonitoringAssignment[];
}
