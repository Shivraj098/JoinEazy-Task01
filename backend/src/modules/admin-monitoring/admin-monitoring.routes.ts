import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRole } from "../../middleware/authorize-role.js";
import { parseInput } from "../../utils/validate.js";
import { adminMonitoringQuerySchema } from "./admin-monitoring.schemas.js";
import { getAdminMonitoring, getAdminOverview } from "./admin-monitoring.service.js";

export const adminMonitoringRouter = Router();
adminMonitoringRouter.get("/overview", authenticate, authorizeRole("ADMIN"), async (_req, res) => {
  const overview = await getAdminOverview();
  res.json({ data: overview });
});

adminMonitoringRouter.get("/monitoring", authenticate, authorizeRole("ADMIN"), async (req, res) => {
  const query = parseInput(adminMonitoringQuerySchema, {
    assignmentId: req.query.assignmentId,
    status: req.query.status,
  });
  const monitoring = await getAdminMonitoring(query);
  res.json({ data: monitoring });
});
