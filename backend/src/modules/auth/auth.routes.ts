import { Router, type Response } from "express";
import { env } from "../../config/env.js";
import { sessionMaxAgeMs, signSessionToken } from "../../lib/session-token.js";
import { authenticate } from "../../middleware/authenticate.js";
import type { AuthUser } from "../../types/auth.js";
import { parseInput } from "../../utils/validate.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { registerStudent, verifyCredentials } from "./auth.service.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

async function startSession(res: Response, user: AuthUser): Promise<void> {
  const token = await signSessionToken(user.id, user.role);
  res.cookie(env.AUTH_COOKIE_NAME, token, { ...cookieOptions, maxAge: sessionMaxAgeMs() });
}

authRouter.post("/register", async (req, res) => {
  const user = await registerStudent(parseInput(registerSchema, req.body));
  await startSession(res, user);
  res.status(201).json({ data: { user } });
});

authRouter.post("/login", async (req, res) => {
  const user = await verifyCredentials(parseInput(loginSchema, req.body));
  await startSession(res, user);
  res.json({ data: { user } });
});

// Clearing a cookie is harmless without a valid session, so logout is not authenticated.
authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.AUTH_COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ data: { user: req.user } });
});
