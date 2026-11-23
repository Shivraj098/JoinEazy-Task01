// Vercel entry point: exposes the Express app as a single serverless function.
// All /api/* requests are rewritten to this file (see vercel.json).
import app from "../backend/src/app.js";

export default app;
