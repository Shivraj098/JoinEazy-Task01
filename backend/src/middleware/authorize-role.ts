import type { RequestHandler } from "express";
import type { Role } from "../generated/prisma/client.js";
import { AppError } from "../utils/app-error.js";

/** Must run after `authenticate`. */
export function authorizeRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    if (!allowed.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to do that.");
    }
    next();
  };
}
