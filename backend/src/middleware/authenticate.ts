import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/session-token.js";
import { AppError } from "../utils/app-error.js";

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");

/**
 * Verifies the session cookie and attaches the current user to the request.
 * The user is reloaded on every request so a removed account or changed role
 * takes effect immediately rather than when the token expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[env.AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) throw unauthenticated();

  const userId = await verifySessionToken(token);
  if (userId === null) throw unauthenticated();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, studentId: true, role: true },
  });
  if (!user) throw unauthenticated();

  req.user = user;
  next();
};
