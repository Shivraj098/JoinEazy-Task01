import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { parseInput } from "../../utils/validate.js";
import { requireAuthenticatedUser } from "../../utils/require-authenticated-user.js";
import {
  assignmentIdParamsSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} from "./assignments.schemas.js";
import {
  createAssignment,
  getAdminAssignment,
  listAdminAssignments,
  listGroupsForAssignmentTargeting,
  updateAssignment,
} from "./assignments.service.js";
import {
  getStudentAssignmentWithProgress,
  listStudentAssignmentsWithProgress,
} from "../submissions/submissions.service.js";

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticate, authorizeRole("STUDENT"));
assignmentsRouter.get("/", async (req, res) => {
  const user = requireAuthenticatedUser(req);
  const result = await listStudentAssignmentsWithProgress(user.id);
  res.json({ data: result });
});
assignmentsRouter.get("/:assignmentId", async (req, res) => {
  const user = requireAuthenticatedUser(req);
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const result = await getStudentAssignmentWithProgress(assignmentId, user.id);
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
  const user = requireAuthenticatedUser(req);
  const assignment = await createAssignment(parseInput(createAssignmentSchema, req.body), user.id);
  res.status(201).json({ data: { assignment } });
});
adminRouter.patch("/assignments/:assignmentId", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const assignment = await updateAssignment(
    assignmentId,
    parseInput(updateAssignmentSchema, req.body),
  );
  res.json({ data: { assignment } });
});
