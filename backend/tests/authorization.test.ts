import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminUser, sessionCookie, studentUser } from "./helpers.js";

const prismaMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));

vi.mock("../src/lib/prisma.js", () => ({ prisma: prismaMock }));

import { authenticate } from "../src/middleware/authenticate.js";
import { authorizeRole } from "../src/middleware/authorize-role.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { signSessionToken } from "../src/lib/session-token.js";

const testApp = express();
testApp.use(cookieParser());
testApp.get("/admin-only", authenticate, authorizeRole("ADMIN"), (_req, res) => {
  res.json({ data: "ok" });
});
testApp.get("/student-only", authenticate, authorizeRole("STUDENT"), (_req, res) => {
  res.json({ data: "ok" });
});
testApp.use(errorHandler);

describe("role authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 without a session", async () => {
    const response = await request(testApp).get("/admin-only");
    expect(response.status).toBe(401);
  });

  it("returns 403 when a student calls an admin route", async () => {
    prismaMock.user.findUnique.mockResolvedValue(studentUser);
    const token = await signSessionToken(studentUser.id, "STUDENT");

    const response = await request(testApp).get("/admin-only").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows an admin on an admin route", async () => {
    prismaMock.user.findUnique.mockResolvedValue(adminUser);
    const token = await signSessionToken(adminUser.id, "ADMIN");

    const response = await request(testApp).get("/admin-only").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(200);
  });

  it("returns 403 when an admin calls a student-only route", async () => {
    prismaMock.user.findUnique.mockResolvedValue(adminUser);
    const token = await signSessionToken(adminUser.id, "ADMIN");

    const response = await request(testApp)
      .get("/student-only")
      .set("Cookie", sessionCookie(token));

    expect(response.status).toBe(403);
  });

  it("trusts the database role over the role claim in the token", async () => {
    // Token was issued while the user was an admin; the database now says student.
    prismaMock.user.findUnique.mockResolvedValue(studentUser);
    const token = await signSessionToken(studentUser.id, "ADMIN");

    const response = await request(testApp).get("/admin-only").set("Cookie", sessionCookie(token));

    expect(response.status).toBe(403);
  });
});
