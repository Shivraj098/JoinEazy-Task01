import type { Prisma } from "../../generated/prisma/client.js";

export type GroupAssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "OVERDUE"
  | "COMPLETED"
  | "COMPLETED_LATE";

type ProgressReader = Pick<
  Prisma.TransactionClient,
  "groupMembership" | "submissionConfirmation"
>;

export interface AssignmentDeadline {
  id: string;
  dueAt: Date;
}

export interface GroupAssignmentPair {
  groupId: string;
  assignmentId: string;
}

interface ProgressMembership {
  studentId: string;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string | null;
  };
}

interface ProgressConfirmation {
  assignmentId: string;
  studentId: string;
  confirmedAt: Date;
}

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

function buildGroupAssignmentProgress(
  groupId: string,
  assignment: AssignmentDeadline,
  memberships: ProgressMembership[],
  confirmations: ProgressConfirmation[],
  now: Date,
): GroupAssignmentProgress {
  const confirmedByStudent = new Map(
    confirmations.map((confirmation) => [confirmation.studentId, confirmation.confirmedAt]),
  );
  const members = memberships.map(({ studentId, student }) => {
    const confirmedAt = confirmedByStudent.get(studentId) ?? null;
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      confirmedAt,
      isConfirmed: confirmedAt !== null,
    };
  });
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
}

/**
 * Computes progress from current group membership, never from a stored percentage.
 * The same derivation is used by student views, admin monitoring and analytics.
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

  const confirmationsByAssignment = new Map<string, ProgressConfirmation[]>();
  for (const confirmation of confirmations) {
    const current = confirmationsByAssignment.get(confirmation.assignmentId) ?? [];
    current.push(confirmation);
    confirmationsByAssignment.set(confirmation.assignmentId, current);
  }

  return assignments.map((assignment) =>
    buildGroupAssignmentProgress(
      groupId,
      assignment,
      memberships,
      confirmationsByAssignment.get(assignment.id) ?? [],
      now,
    ),
  );
}

/**
 * Batched equivalent for professor monitoring. It loads memberships and confirmations
 * once for the requested group/assignment pairs, then applies the same status derivation.
 */
export async function getGroupAssignmentProgressForPairs(
  db: ProgressReader,
  pairs: GroupAssignmentPair[],
  assignments: AssignmentDeadline[],
  now: Date = new Date(),
): Promise<GroupAssignmentProgress[]> {
  if (pairs.length === 0 || assignments.length === 0) return [];

  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const uniquePairs = Array.from(
    new Map(pairs.map((pair) => [`${pair.assignmentId}:${pair.groupId}`, pair])).values(),
  ).filter((pair) => assignmentById.has(pair.assignmentId));
  if (uniquePairs.length === 0) return [];

  const groupIds = Array.from(new Set(uniquePairs.map((pair) => pair.groupId)));
  const assignmentIds = Array.from(new Set(uniquePairs.map((pair) => pair.assignmentId)));
  const memberships = await db.groupMembership.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { joinedAt: "asc" },
    select: {
      groupId: true,
      studentId: true,
      student: { select: { id: true, name: true, email: true, studentId: true } },
    },
  });
  const studentIds = Array.from(new Set(memberships.map((membership) => membership.studentId)));
  const confirmations = studentIds.length === 0
    ? []
    : await db.submissionConfirmation.findMany({
        where: {
          groupId: { in: groupIds },
          assignmentId: { in: assignmentIds },
          studentId: { in: studentIds },
        },
        select: { groupId: true, assignmentId: true, studentId: true, confirmedAt: true },
      });

  const membershipsByGroup = new Map<string, ProgressMembership[]>();
  for (const membership of memberships) {
    const current = membershipsByGroup.get(membership.groupId) ?? [];
    current.push({ studentId: membership.studentId, student: membership.student });
    membershipsByGroup.set(membership.groupId, current);
  }

  const confirmationsByPair = new Map<string, ProgressConfirmation[]>();
  for (const confirmation of confirmations) {
    const key = `${confirmation.assignmentId}:${confirmation.groupId}`;
    const current = confirmationsByPair.get(key) ?? [];
    current.push(confirmation);
    confirmationsByPair.set(key, current);
  }

  return uniquePairs.map((pair) => {
    const key = `${pair.assignmentId}:${pair.groupId}`;
    return buildGroupAssignmentProgress(
      pair.groupId,
      assignmentById.get(pair.assignmentId)!,
      membershipsByGroup.get(pair.groupId) ?? [],
      confirmationsByPair.get(key) ?? [],
      now,
    );
  });
}
