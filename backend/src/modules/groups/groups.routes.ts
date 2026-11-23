import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { parseInput } from "../../utils/validate.js";
import { addGroupMemberSchema, createGroupSchema, groupIdParamsSchema, studentSearchSchema } from "./groups.schemas.js";
import { addStudentToGroup, createStudentGroup, getStudentGroup, searchAvailableStudents } from "./groups.service.js";

export const groupsRouter = Router();
groupsRouter.use(authenticate, authorizeRole("STUDENT"));

groupsRouter.get("/me", async (req, res) => {
  const group = await getStudentGroup(req.user!.id);
  res.json({ data: { group } });
});

groupsRouter.post("/", async (req, res) => {
  const group = await createStudentGroup(req.user!, parseInput(createGroupSchema, req.body));
  res.status(201).json({ data: { group } });
});

groupsRouter.post("/:groupId/members", async (req, res) => {
  const { groupId } = parseInput(groupIdParamsSchema, req.params);
  const group = await addStudentToGroup(req.user!, groupId, parseInput(addGroupMemberSchema, req.body));
  res.status(201).json({ data: { group } });
});

export const studentsRouter = Router();
studentsRouter.use(authenticate, authorizeRole("STUDENT"));
studentsRouter.get("/search", async (req, res) => {
  const { q } = parseInput(studentSearchSchema, { q: req.query.q });
  const students = await searchAvailableStudents(req.user!.id, q);
  res.json({ data: { students } });
});
