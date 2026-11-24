import { prisma } from "../../lib/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { normalizeEmail, normalizeStudentId } from "../../utils/normalize.js";
import { AppError } from "../../utils/app-error.js";
import type { AddGroupMemberInput, CreateGroupInput } from "./groups.schemas.js";

const groupDetails = {
  leader: { select: { id: true, name: true, email: true, studentId: true } },
  members: {
    orderBy: { joinedAt: "asc" as const },
    include: { student: { select: { id: true, name: true, email: true, studentId: true } } },
  },
};

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function groupConflict(): AppError {
  return new AppError(409, "GROUP_MEMBERSHIP_CONFLICT", "This student already belongs to a group.");
}

export async function createStudentGroup(user: AuthUser, input: CreateGroupInput) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const membership = await tx.groupMembership.findUnique({
          where: { studentId: user.id },
          select: { groupId: true },
        });
        if (membership) {
          throw new AppError(409, "ALREADY_IN_GROUP", "You already belong to a group.");
        }

        return tx.group.create({
          data: {
            name: input.name,
            leader: { connect: { id: user.id } },
            members: { create: { student: { connect: { id: user.id } } } },
          },
          include: groupDetails,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) throw groupConflict();
    throw error;
  }
}

export async function getStudentGroup(userId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { studentId: userId },
    select: { groupId: true },
  });
  if (!membership) return null;

  return prisma.group.findUnique({
    where: { id: membership.groupId },
    include: groupDetails,
  });
}

export async function searchAvailableStudents(userId: string, query: string) {
  const ledGroup = await prisma.group.findFirst({
    where: { leaderId: userId },
    select: { id: true },
  });
  if (!ledGroup) {
    throw new AppError(403, "GROUP_LEADER_REQUIRED", "Only a group leader can add members.");
  }

  const normalizedQuery = query.trim();
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      id: { not: userId },
      membership: null,
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { email: { contains: normalizeEmail(normalizedQuery), mode: "insensitive" } },
        { studentId: { contains: normalizeStudentId(normalizedQuery), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, studentId: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 10,
  });
}

export async function addStudentToGroup(
  user: AuthUser,
  groupId: string,
  input: AddGroupMemberInput,
) {
  const identifier = input.identifier.trim();
  const lookup = identifier.includes("@")
    ? { email: normalizeEmail(identifier) }
    : { studentId: normalizeStudentId(identifier) };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: { id: true, leaderId: true },
        });
        if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "The group could not be found.");
        if (group.leaderId !== user.id) {
          throw new AppError(
            403,
            "GROUP_LEADER_REQUIRED",
            "Only the group leader can add members.",
          );
        }

        const student = await tx.user.findUnique({
          where: lookup,
          select: { id: true, role: true },
        });
        if (!student || student.role !== "STUDENT") {
          throw new AppError(
            404,
            "STUDENT_NOT_FOUND",
            "No registered student matches that email or ID.",
          );
        }
        if (student.id === user.id) {
          throw new AppError(409, "ALREADY_IN_GROUP", "You are already a member of this group.");
        }

        const existingMembership = await tx.groupMembership.findUnique({
          where: { studentId: student.id },
          select: { groupId: true },
        });
        if (existingMembership) {
          throw new AppError(
            409,
            "STUDENT_ALREADY_IN_GROUP",
            "This student already belongs to a group.",
          );
        }

        await tx.groupMembership.create({ data: { groupId, studentId: student.id } });
        return tx.group.findUniqueOrThrow({ where: { id: groupId }, include: groupDetails });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) {
      throw new AppError(
        409,
        "STUDENT_ALREADY_IN_GROUP",
        "This student was added to another group. Refresh and try again.",
      );
    }
    throw error;
  }
}
