import type { Prisma } from "../../generated/prisma/client.js";

export type GroupAssignmentStatus = "PENDING" | "IN_PROGRESS" | "OVERDUE" | "COMPLETED" | "COMPLETED_LATE";

type ProgressReader = Pick<Prisma.TransactionClient, "groupMembership" | "submissionConfirmation">;
type AssignmentDeadline = { id: string; dueAt: Date };

export interface GroupAssignmentProgress {
  groupId: string;
  assignmentId: string;
  dueAt: Date;
  memberCount: number;
  confirmedCount: number;
  progressPercentage: number;
  status: GroupAssignmentStatus;
  latestConfirmedAt: Date | null;
  members: Array<{
    id: string;
    name: string;
    email: string;
    studentId: string | null;
    confirmedAt: Date | null;
    isConfirmed: boolean;
  }>;
}

export function deriveGroupAssignmentStatus(
  confirmedCount: number,
  memberCount: number,
  dueAt: Date,
  latestConfirmedAt: Date | null,
  now: Date = new Date(),
): GroupAssignmentStatus {
  if (memberCount > 0 && confirmedCount === memberCount) {
    return latestConfirmedAt && latestConfirmedAt.getTime() > dueAt.getTime()
      ? "COMPLETED_LATE"
      : "COMPLETED";
  }
  if (now.getTime() > dueAt.getTime()) return "OVERDUE";
  return confirmedCount > 0 ? "IN_PROGRESS" : "PENDING";
}

/**
 * Computes progress from current group membership, never from a stored percentage.
 * This is intentionally reusable by student views and the later admin monitoring module.
 */
export async function getGroupAssignmentProgressForAssignments(
  db: ProgressReader,
  groupId: string,
  assignments: AssignmentDeadline[],
  now: Date = new Date(),
): Promise<GroupAssignmentProgress[]> {
  if (assignments.length === 0) return [];

  const memberships = await db.groupMembership.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    select: {
      studentId: true,
      student: { select: { id: true, name: true, email: true, studentId: true } },
    },
  });
  const studentIds = memberships.map((membership) => membership.studentId);
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const confirmations = studentIds.length === 0
    ? []
    : await db.submissionConfirmation.findMany({
        where: { groupId, assignmentId: { in: assignmentIds }, studentId: { in: studentIds } },
        select: { assignmentId: true, studentId: true, confirmedAt: true },
      });

  const byAssignment = new Map<string, Map<string, Date>>();
  for (const confirmation of confirmations) {
    const perStudent = byAssignment.get(confirmation.assignmentId) ?? new Map<string, Date>();
    perStudent.set(confirmation.studentId, confirmation.confirmedAt);
    byAssignment.set(confirmation.assignmentId, perStudent);
  }

  return assignments.map((assignment) => {
    const confirmedByStudent = byAssignment.get(assignment.id) ?? new Map<string, Date>();
    const members = memberships.map(({ studentId, student }) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      confirmedAt: confirmedByStudent.get(studentId) ?? null,
      isConfirmed: confirmedByStudent.has(studentId),
    }));
    const confirmedCount = members.filter((member) => member.isConfirmed).length;
    const memberCount = members.length;
    const latestConfirmedAt = members.reduce<Date | null>((latest, member) => {
      if (!member.confirmedAt) return latest;
      return latest === null || member.confirmedAt > latest ? member.confirmedAt : latest;
    }, null);

    return {
      groupId,
      assignmentId: assignment.id,
      dueAt: assignment.dueAt,
      memberCount,
      confirmedCount,
      progressPercentage: memberCount === 0 ? 0 : Math.round((confirmedCount / memberCount) * 100),
      status: deriveGroupAssignmentStatus(confirmedCount, memberCount, assignment.dueAt, latestConfirmedAt, now),
      latestConfirmedAt,
      members,
    };
  });
}
