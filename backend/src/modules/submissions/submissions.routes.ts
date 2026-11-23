import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { parseInput } from "../../utils/validate.js";
import { assignmentIdParamsSchema } from "../assignments/assignments.schemas.js";
import { confirmAssignmentSubmission, getStudentAssignmentWithProgress, listStudentAssignmentsWithProgress } from "./submissions.service.js";

export const studentAssignmentsRouter = Router();
studentAssignmentsRouter.use(authenticate, authorizeRole("STUDENT"));
studentAssignmentsRouter.get("/", async (req, res) => {
  const result = await listStudentAssignmentsWithProgress(req.user!.id);
  res.json({ data: result });
});
studentAssignmentsRouter.get("/:assignmentId", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const result = await getStudentAssignmentWithProgress(assignmentId, req.user!.id);
  res.json({ data: result });
});

export const submissionsRouter = Router();
submissionsRouter.use(authenticate, authorizeRole("STUDENT"));
submissionsRouter.post("/:assignmentId/confirm", async (req, res) => {
  const { assignmentId } = parseInput(assignmentIdParamsSchema, req.params);
  const result = await confirmAssignmentSubmission(assignmentId, req.user!.id);
  res.status(result.alreadyConfirmed ? 200 : 201).json({ data: result });
});
