import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { healthRouter } from "./modules/health/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

app.use("/api/health", healthRouter);

app.use(notFound);
app.use(errorHandler);

// Vercel imports the app as the default export; server.ts is the local listener.
export default app;
