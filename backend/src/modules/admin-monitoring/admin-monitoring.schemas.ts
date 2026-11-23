import { z } from "zod";

export const groupAssignmentStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "OVERDUE",
  "COMPLETED",
  "COMPLETED_LATE",
]);

export const adminMonitoringQuerySchema = z.strictObject({
  assignmentId: z.string().uuid().optional(),
  status: groupAssignmentStatusSchema.optional(),
});

export type AdminMonitoringQuery = z.output<typeof adminMonitoringQuerySchema>;
