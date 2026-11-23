import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie authentication, on top of SameSite=Lax: browsers send
 * an Origin header on cross-site state-changing requests, so a request whose
 * Origin is neither this app nor the configured development origin is refused.
 * Requests without an Origin header (curl, server-to-server) are not browser
 * form posts and are allowed through.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  const requestHost = req.get("x-forwarded-host") ?? req.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed.");
  }

  if (origin === env.APP_ORIGIN || originHost === requestHost) {
    next();
    return;
  }
  throw new AppError(403, "INVALID_ORIGIN", "Request origin is not allowed.");
};
