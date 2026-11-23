import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { app } from "../src/app.js";

describe("origin check on state-changing requests", () => {
  it("refuses a foreign origin", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_ORIGIN");
  });

  it("accepts the configured development origin", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(204);
  });

  it("accepts an origin that matches the forwarded host", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("X-Forwarded-Host", "joineazy.vercel.app")
      .set("Origin", "https://joineazy.vercel.app");

    expect(response.status).toBe(204);
  });

  it("does not restrict safe methods", async () => {
    const response = await request(app).get("/api/health").set("Origin", "https://evil.example");

    expect(response.status).toBe(200);
  });
});
