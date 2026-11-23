import { z } from "zod";

export const createGroupSchema = z.strictObject({
  name: z.string().trim().min(2, "Group name must be at least 2 characters").max(60),
});

export const addGroupMemberSchema = z.strictObject({
  identifier: z.string().trim().min(2).max(254),
});

export const studentSearchSchema = z.strictObject({
  q: z.string().trim().min(2, "Enter at least 2 characters").max(100),
});

export const groupIdParamsSchema = z.strictObject({
  groupId: z.string().uuid(),
});

export type CreateGroupInput = z.output<typeof createGroupSchema>;
export type AddGroupMemberInput = z.output<typeof addGroupMemberSchema>;
