export type AssignmentTarget = "ALL_STUDENTS" | "SELECTED_GROUPS";

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  oneDriveUrl: string;
  targetType: AssignmentTarget;
  createdAt: string;
  createdBy: { name: string };
}

export interface AdminAssignment extends Omit<StudentAssignment, "createdBy"> {
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
