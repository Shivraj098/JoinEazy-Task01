import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { parseInput } from "../../utils/validate.js";
import { assignmentIdParamsSchema, createAssignmentSchema, updateAssignmentSchema } from "./assignments.schemas.js";
import { createAssignment, getAdminAssignment, getStudentAssignment, listAdminAssignments, listGroupsForAssignmentTargeting, listStudentAssignments, updateAssignment } from "./assignments.service.js";

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticate, authorizeRole("STUDENT"));
assignmentsRouter.get("/", async (req, res) => {
  const result = await listStudentAssignments(req.user!.id);
  res.json({ data: result });
});
assignmentsRouter.get("/:assignmentId", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const result = await getStudentAssignment(assignmentId, req.user!.id);
  res.json({ data: result });
});

export const adminRouter = Router();
adminRouter.use(authenticate, authorizeRole("ADMIN"));
adminRouter.get("/groups", async (_req, res) => {
  const groups = await listGroupsForAssignmentTargeting();
  res.json({ data: { groups } });
});
adminRouter.get("/assignments", async (_req, res) => {
  const assignments = await listAdminAssignments();
  res.json({ data: { assignments } });
});
adminRouter.get("/assignments/:assignmentId", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const assignment = await getAdminAssignment(assignmentId);
  res.json({ data: { assignment } });
});
adminRouter.post("/assignments", async (req, res) => {
  const assignment = await createAssignment(parseInput(createAssignmentSchema, req.body), req.user!.id);
  res.status(201).json({ data: { assignment } });
});
adminRouter.patch("/assignments/:assignmentId", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const assignment = await updateAssignment(assignmentId, parseInput(updateAssignmentSchema, req.body));
  res.json({ data: { assignment } });
});
