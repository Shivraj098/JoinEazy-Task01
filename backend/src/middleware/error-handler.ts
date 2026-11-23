import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) return null;
  const { status } = error;
  return typeof status === "number" && status >= 400 && status < 500 ? status : null;
}

// Express identifies error handlers by their four-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }

  // Malformed JSON, oversized bodies and similar errors raised by body parsing.
  const status = clientErrorStatus(error);
  if (status !== null) {
    res.status(status).json({
      error: { code: "BAD_REQUEST", message: "The request could not be processed.", details: null },
    });
    return;
  }

  console.error("Unhandled error:", error);
  res
    .status(500)
    .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong.", details: null } });
};
