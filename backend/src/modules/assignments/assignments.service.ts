import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { AssignmentInput } from "./assignments.schemas.js";

const assignmentDetails = {
  createdBy: { select: { id: true, name: true, email: true } },
  groups: { include: { group: { select: { id: true, name: true } } } },
  _count: { select: { confirmations: true } },
} satisfies Prisma.AssignmentInclude;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function assertSelectedGroupsExist(
  db: Prisma.TransactionClient,
  groupIds: string[],
): Promise<void> {
  if (groupIds.length === 0) return;
  const groups = await db.group.findMany({ where: { id: { in: groupIds } }, select: { id: true } });
  if (groups.length !== groupIds.length) {
    throw new AppError(
      400,
      "INVALID_GROUP_SELECTION",
      "One or more selected groups no longer exist.",
    );
  }
}

function groupLinks(groupIds: string[]) {
  return { create: groupIds.map((groupId) => ({ group: { connect: { id: groupId } } })) };
}

export async function listAdminAssignments() {
  return prisma.assignment.findMany({
    orderBy: [{ createdAt: "desc" }, { title: "asc" }],
    include: assignmentDetails,
  });
}

export async function getAdminAssignment(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: assignmentDetails,
  });
  if (!assignment)
    throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "The assignment could not be found.");
  return assignment;
}

export async function listGroupsForAssignmentTargeting() {
  return prisma.group.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      leader: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
}

export async function createAssignment(input: AssignmentInput, adminId: string) {
  return prisma.$transaction(
    async (tx) => {
      if (input.targetType === "SELECTED_GROUPS")
        await assertSelectedGroupsExist(tx, input.groupIds);
      return tx.assignment.create({
        data: {
          title: input.title,
          description: input.description,
          dueAt: new Date(input.dueAt),
          oneDriveUrl: input.oneDriveUrl,
          targetType: input.targetType,
          createdBy: { connect: { id: adminId } },
          ...(input.targetType === "SELECTED_GROUPS" ? { groups: groupLinks(input.groupIds) } : {}),
        },
        include: assignmentDetails,
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function updateAssignment(assignmentId: string, input: AssignmentInput) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.assignment.findUnique({
          where: { id: assignmentId },
          include: {
            groups: { select: { groupId: true } },
            _count: { select: { confirmations: true } },
          },
        });
        if (!existing)
          throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "The assignment could not be found.");

        const currentGroupIds = existing.groups.map((entry) => entry.groupId).sort();
        const nextGroupIds = [...input.groupIds].sort();
        const targetChanged =
          existing.targetType !== input.targetType ||
          currentGroupIds.length !== nextGroupIds.length ||
          currentGroupIds.some((groupId, index) => groupId !== nextGroupIds[index]);

        if (targetChanged && existing._count.confirmations > 0) {
          throw new AppError(
            409,
            "ASSIGNMENT_TARGET_LOCKED",
            "Assignment targeting cannot change after a student has confirmed submission.",
          );
        }
        if (input.targetType === "SELECTED_GROUPS")
          await assertSelectedGroupsExist(tx, input.groupIds);

        return tx.assignment.update({
          where: { id: assignmentId },
          data: {
            title: input.title,
            description: input.description,
            dueAt: new Date(input.dueAt),
            oneDriveUrl: input.oneDriveUrl,
            targetType: input.targetType,
            groups: {
              deleteMany: {},
              ...(input.targetType === "SELECTED_GROUPS" ? groupLinks(input.groupIds) : {}),
            },
          },
          include: assignmentDetails,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaCode(error, "P2034")) {
      throw new AppError(
        409,
        "ASSIGNMENT_CHANGED_RETRY",
        "The assignment changed concurrently. Refresh and try again.",
      );
    }
    throw error;
  }
}

const studentAssignmentSelect = {
  id: true,
  title: true,
  description: true,
  dueAt: true,
  oneDriveUrl: true,
  targetType: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} satisfies Prisma.AssignmentSelect;

async function eligibleGroupId(studentId: string): Promise<string | null> {
  const membership = await prisma.groupMembership.findUnique({
    where: { studentId },
    select: { groupId: true },
  });
  return membership?.groupId ?? null;
}

function eligibleAssignmentWhere(groupId: string | null): Prisma.AssignmentWhereInput {
  return {
    OR: [
      { targetType: "ALL_STUDENTS" },
      ...(groupId
        ? [{ targetType: "SELECTED_GROUPS" as const, groups: { some: { groupId } } }]
        : []),
    ],
  };
}

export async function listStudentAssignments(studentId: string) {
  const groupId = await eligibleGroupId(studentId);
  const assignments = await prisma.assignment.findMany({
    where: eligibleAssignmentWhere(groupId),
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    select: studentAssignmentSelect,
  });
  return { assignments, groupId };
}

export async function getStudentAssignment(assignmentId: string, studentId: string) {
  const groupId = await eligibleGroupId(studentId);
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, ...eligibleAssignmentWhere(groupId) },
    select: studentAssignmentSelect,
  });
  if (!assignment) {
    // Deliberately do not disclose whether an ineligible assignment ID exists.
    throw new AppError(
      404,
      "ASSIGNMENT_NOT_FOUND",
      "The assignment is not available to your group.",
    );
  }
  return { assignment, groupId };
}
