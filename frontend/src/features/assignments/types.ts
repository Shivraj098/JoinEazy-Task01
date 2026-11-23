export type AssignmentTarget = "ALL_STUDENTS" | "SELECTED_GROUPS";
export type GroupAssignmentStatus = "PENDING" | "IN_PROGRESS" | "OVERDUE" | "COMPLETED" | "COMPLETED_LATE";

export interface GroupAssignmentProgress {
  groupId: string;
  assignmentId: string;
  dueAt: string;
  memberCount: number;
  confirmedCount: number;
  progressPercentage: number;
  status: GroupAssignmentStatus;
  latestConfirmedAt: string | null;
  members: Array<{
    id: string;
    name: string;
    email: string;
    studentId: string | null;
    confirmedAt: string | null;
    isConfirmed: boolean;
  }>;
}

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  oneDriveUrl: string;
  targetType: AssignmentTarget;
  createdAt: string;
  createdBy: { name: string };
  groupProgress: GroupAssignmentProgress | null;
  currentUserConfirmed: boolean;
}

export interface AdminAssignment extends Omit<StudentAssignment, "createdBy" | "groupProgress" | "currentUserConfirmed"> {
  createdBy: { id: string; name: string; email: string };
  groups: Array<{ groupId: string; group: { id: string; name: string } }>;
  _count: { confirmations: number };
}

export interface AssignmentGroupOption {
  id: string;
  name: string;
  leader: { id: string; name: string };
  _count: { members: number };
}
