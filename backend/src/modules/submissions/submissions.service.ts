import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { getStudentAssignment, listStudentAssignments } from "../assignments/assignments.service.js";
import { getGroupAssignmentProgressForAssignments } from "./progress.service.js";

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function eligibleAssignmentWhere(groupId: string): Prisma.AssignmentWhereInput {
  return {
    OR: [
      { targetType: "ALL_STUDENTS" },
      { targetType: "SELECTED_GROUPS", groups: { some: { groupId } } },
    ],
  };
}

export async function confirmAssignmentSubmission(assignmentId: string, studentId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const membership = await tx.groupMembership.findUnique({
        where: { studentId },
        select: { groupId: true },
      });
      if (!membership) {
        throw new AppError(409, "GROUP_REQUIRED", "Create or join a group before confirming its submission.");
      }

      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, ...eligibleAssignmentWhere(membership.groupId) },
        select: { id: true, dueAt: true },
      });
      if (!assignment) {
        throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "The assignment is not available to your group.");
      }

      const existing = await tx.submissionConfirmation.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
      });
      if (existing) {
        const [groupProgress] = await getGroupAssignmentProgressForAssignments(tx, membership.groupId, [assignment]);
        return { confirmation: existing, alreadyConfirmed: true, groupProgress };
      }

      const confirmation = await tx.submissionConfirmation.create({
        data: { assignmentId, studentId, groupId: membership.groupId },
      });
      const [groupProgress] = await getGroupAssignmentProgressForAssignments(tx, membership.groupId, [assignment]);
      return { confirmation, alreadyConfirmed: false, groupProgress };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) {
      // A concurrent retry may have created the unique confirmation first. Treat
      // that case as an idempotent success; otherwise ask the client to retry.
      const existing = await prisma.submissionConfirmation.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
      });
      if (existing) {
        const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { id: true, dueAt: true } });
        if (assignment) {
          const [groupProgress] = await getGroupAssignmentProgressForAssignments(prisma, existing.groupId, [assignment]);
          return { confirmation: existing, alreadyConfirmed: true, groupProgress };
        }
      }
      if (isPrismaCode(error, "P2034")) {
        throw new AppError(409, "CONFIRMATION_RETRY", "The confirmation changed concurrently. Please try again.");
      }
    }
    throw error;
  }
}

export async function listStudentAssignmentsWithProgress(studentId: string) {
  const { assignments, groupId } = await listStudentAssignments(studentId);
  if (!groupId) {
    return {
      assignments: assignments.map((assignment) => ({ ...assignment, groupProgress: null, currentUserConfirmed: false })),
      groupId,
    };
  }
  const progress = await getGroupAssignmentProgressForAssignments(prisma, groupId, assignments);
  const progressByAssignment = new Map(progress.map((item) => [item.assignmentId, item]));
  return {
    assignments: assignments.map((assignment) => {
      const groupProgress = progressByAssignment.get(assignment.id) ?? null;
      return {
        ...assignment,
        groupProgress,
        currentUserConfirmed: groupProgress?.members.find((member) => member.id === studentId)?.isConfirmed ?? false,
      };
    }),
    groupId,
  };
}

export async function getStudentAssignmentWithProgress(assignmentId: string, studentId: string) {
  const { assignment, groupId } = await getStudentAssignment(assignmentId, studentId);
  if (!groupId) return { assignment, groupId, groupProgress: null, currentUserConfirmed: false };
  const [groupProgress] = await getGroupAssignmentProgressForAssignments(prisma, groupId, [assignment]);
  return {
    assignment,
    groupId,
    groupProgress: groupProgress ?? null,
    currentUserConfirmed: groupProgress?.members.find((member) => member.id === studentId)?.isConfirmed ?? false,
  };
}
