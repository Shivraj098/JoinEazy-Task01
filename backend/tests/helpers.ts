import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export const COOKIE_NAME = "joineazy_session";

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}`;
}

/** A correctly signed token that expired a minute ago. */
export function expiredToken(userId: string): Promise<string> {
  const past = Math.floor(Date.now() / 1000) - 3600;
  return new SignJWT({ role: "STUDENT" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(past - 60)
    .setExpirationTime(past)
    .sign(secret);
}

export const studentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Aarav Sharma",
  email: "aarav@example.com",
  studentId: "STU-1001",
  role: "STUDENT" as const,
};

export const adminUser = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Prof. Rao",
  email: "rao@example.com",
  studentId: null,
  role: "ADMIN" as const,
};
