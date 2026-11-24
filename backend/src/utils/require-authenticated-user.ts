import type { Request } from "express";
import type { AuthUser } from "../types/auth.js";
import { AppError } from "./app-error.js";

/**
 * Returns the authenticated user attached by the authenticate middleware.
 * The explicit guard keeps route handlers safe even though Express requests
 * can also reach TypeScript code before authentication has run.
 */
export function requireAuthenticatedUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }
  return user;
}
