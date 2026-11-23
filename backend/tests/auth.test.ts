import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, expiredToken, sessionCookie, studentUser } from "./helpers.js";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("../src/lib/prisma.js", () => ({ prisma: prismaMock }));

import { app } from "../src/app.js";
import { signSessionToken } from "../src/lib/session-token.js";

const validRegistration = {
  name: "Aarav Sharma",
  email: "aarav@example.com",
  studentId: "STU-1001",
  password: "a-strong-password",
};

function setCookieHeader(response: request.Response): string {
  const header = response.headers["set-cookie"];
  return Array.isArray(header) ? header.join("; ") : (header ?? "");
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      id: studentUser.id,
      name: data.name,
      email: data.email,
      studentId: data.studentId,
      role: data.role,
    }));
  });

  it("creates a student, normalizes identifiers and starts a session", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, email: "  Aarav@Example.COM ", studentId: " stu-1001 " });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual({
      id: studentUser.id,
      name: "Aarav Sharma",
      email: "aarav@example.com",
      studentId: "STU-1001",
      role: "STUDENT",
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const createArgs = prismaMock.user.create.mock.calls[0]?.[0];
    expect(createArgs.data.role).toBe("STUDENT");
    expect(createArgs.data.passwordHash).not.toBe(validRegistration.password);
    expect(await bcrypt.compare(validRegistration.password, createArgs.data.passwordHash)).toBe(
      true,
    );

    const cookie = setCookieHeader(response);
    expect(cookie).toContain(`${COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("rejects an attempt to choose a role", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns field-level errors for invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "not-an-email", studentId: "   ", password: "short" });

    expect(response.status).toBe(400);
    const fields = Object.keys(response.body.error.details.fieldErrors);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "studentId", "password"]));
  });

  it("rejects a student ID longer than 64 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, studentId: "X".repeat(65) });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fieldErrors.studentId).toBeDefined();
  });

  it("rejects a duplicate email", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ email: "aarav@example.com", studentId: "OTHER" });

    const response = await request(app).post("/api/auth/register").send(validRegistration);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
    expect(response.body.error.details.fieldErrors.email).toBeDefined();
  });

  it("rejects a duplicate student ID", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      email: "other@example.com",
      studentId: "STU-1001",
    });

    const response = await request(app).post("/api/auth/register").send(validRegistration);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("STUDENT_ID_TAKEN");
  });

  it("maps a unique-constraint race to a 409", async () => {
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });

    const response = await request(app).post("/api/auth/register").send(validRegistration);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_REGISTERED");
  });
});

describe("POST /api/auth/login", () => {
  it("signs in with correct credentials", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    prismaMock.user.findUnique.mockResolvedValue({ ...studentUser, passwordHash });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "Aarav@Example.com", password: "correct-password" });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("aarav@example.com");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(setCookieHeader(response)).toContain("HttpOnly");
    expect(prismaMock.user.findUnique.mock.calls[0]?.[0].where).toEqual({
      email: "aarav@example.com",
    });
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...studentUser, passwordHash });
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "aarav@example.com", password: "wrong-password" });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(setCookieHeader(wrongPassword)).toBe("");
  });
});

describe("GET /api/auth/me", () => {
  it("rejects requests without a session", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the current user for a valid session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(studentUser);
    const token = await signSessionToken(studentUser.id, "STUDENT");

    const response = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(200);
    expect(response.body.data.user).toEqual(studentUser);
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken(studentUser.id, "STUDENT");
    const tampered = `${token.slice(0, -4)}AAAA`;

    const response = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(tampered));

    expect(response.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const token = await expiredToken(studentUser.id);

    const response = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a valid token whose user no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const token = await signSessionToken(studentUser.id, "STUDENT");

    const response = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
    const cookie = setCookieHeader(response);
    expect(cookie).toContain(`${COOKIE_NAME}=;`);
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
  });
});
