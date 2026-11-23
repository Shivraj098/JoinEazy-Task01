import { prisma } from "../../lib/prisma.js";
import { getGroupAssignmentProgressForPairs, type GroupAssignmentPair } from "../submissions/progress.service.js";
import { summarizeGroupAssignmentProgress } from "./admin-monitoring.metrics.js";
import type { AdminMonitoringQuery } from "./admin-monitoring.schemas.js";

async function loadMonitoringSnapshot(assignmentId?: string) {
  const [assignments, groups] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentId ? { id: assignmentId } : undefined,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        dueAt: true,
        targetType: true,
        groups: { select: { groupId: true } },
      },
    }),
    prisma.group.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const pairs: GroupAssignmentPair[] = [];
  for (const assignment of assignments) {
    const eligibleGroupIds = assignment.targetType === "ALL_STUDENTS"
      ? groups.map((group) => group.id)
      : assignment.groups.map((entry) => entry.groupId).filter((groupId) => groupById.has(groupId));
    for (const groupId of eligibleGroupIds) pairs.push({ assignmentId: assignment.id, groupId });
  }

  const progress = await getGroupAssignmentProgressForPairs(prisma, pairs, assignments);
  return { assignments, groups, groupById, progress };
}

export async function getAdminOverview() {
  const [studentCount, ungroupedStudentCount, groupCount, assignmentCount, snapshot] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", membership: null } }),
    prisma.group.count(),
    prisma.assignment.count(),
    loadMonitoringSnapshot(),
  ]);

  return {
    summary: {
      studentCount,
      ungroupedStudentCount,
      groupCount,
      assignmentCount,
      ...summarizeGroupAssignmentProgress(snapshot.progress),
    },
    assignments: snapshot.assignments.map(({ id, title }) => ({ id, title })),
  };
}

export async function getAdminMonitoring(query: AdminMonitoringQuery) {
  const snapshot = await loadMonitoringSnapshot(query.assignmentId);
  const groupProgress = query.status
    ? snapshot.progress.filter((item) => item.status === query.status)
    : snapshot.progress;
  const progressByAssignment = new Map<string, typeof groupProgress>();
  for (const item of groupProgress) {
    const current = progressByAssignment.get(item.assignmentId) ?? [];
    current.push(item);
    progressByAssignment.set(item.assignmentId, current);
  }

  const assignments = snapshot.assignments
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      targetType: assignment.targetType,
      groups: (progressByAssignment.get(assignment.id) ?? []).map((progress) => ({
        id: progress.groupId,
        name: snapshot.groupById.get(progress.groupId)?.name ?? "Unknown group",
        progress,
      })),
    }))
    .filter((assignment) => !query.status || assignment.groups.length > 0);

  return { assignments };
}
