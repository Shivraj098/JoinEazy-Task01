import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/client.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export function sessionMaxAgeMs(): number {
  return env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000;
}

export function signSessionToken(userId: string, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRES_IN_HOURS}h`)
    .sign(secret);
}

/** Returns the user id from a valid, unexpired token, or null for anything else. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
