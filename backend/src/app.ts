import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { originCheck } from "./middleware/origin-check.js";
import { adminMonitoringRouter } from "./modules/admin-monitoring/admin-monitoring.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminRouter, assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { groupsRouter, studentsRouter } from "./modules/groups/groups.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { submissionsRouter } from "./modules/submissions/submissions.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", originCheck);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/students", studentsRouter);
app.use("/api/admin", adminMonitoringRouter);
app.use("/api/admin", adminRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/submissions", submissionsRouter);

app.use(notFound);
app.use(errorHandler);

// Vercel imports the app as the default export; server.ts is the local listener.
export default app;
