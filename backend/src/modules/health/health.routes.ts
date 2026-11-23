import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const healthRouter = Router();

// Liveness: the process is up. Does not touch the database.
healthRouter.get("/", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

// Readiness: the database accepts queries. May be slow right after Neon wakes from idle.
healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: "ready" } });
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The service is not ready yet.",
        details: null,
      },
    });
  }
});
