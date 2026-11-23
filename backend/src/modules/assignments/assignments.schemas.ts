import { z } from "zod";

const assignmentFields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().min(1, "Description is required").max(10000),
  dueAt: z.iso.datetime({ message: "Enter a valid assignment deadline" }),
  oneDriveUrl: z.url("Enter a valid OneDrive submission URL").refine((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "The submission link must use HTTPS"),
  targetType: z.enum(["ALL_STUDENTS", "SELECTED_GROUPS"]),
  groupIds: z.array(z.string().uuid()).max(100).default([]),
};

function validateTargets(value: { targetType: "ALL_STUDENTS" | "SELECTED_GROUPS"; groupIds: string[] }, ctx: z.RefinementCtx) {
  if (value.targetType === "SELECTED_GROUPS" && value.groupIds.length === 0) {
    ctx.addIssue({ code: "custom", path: ["groupIds"], message: "Select at least one group." });
  }
  if (value.targetType === "ALL_STUDENTS" && value.groupIds.length > 0) {
    ctx.addIssue({ code: "custom", path: ["groupIds"], message: "All-student assignments cannot specify individual groups." });
  }
  if (new Set(value.groupIds).size !== value.groupIds.length) {
    ctx.addIssue({ code: "custom", path: ["groupIds"], message: "A group can only be selected once." });
  }
}

export const createAssignmentSchema = z.strictObject(assignmentFields).superRefine(validateTargets);
export const updateAssignmentSchema = z.strictObject(assignmentFields).superRefine(validateTargets);
export const assignmentIdParamsSchema = z.strictObject({ assignmentId: z.string().uuid() });

export type AssignmentInput = z.output<typeof createAssignmentSchema>;
