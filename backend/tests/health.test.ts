import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { $queryRaw: queryRaw },
}));

import { app } from "../src/app.js";

describe("health endpoints", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("reports liveness without touching the database", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("reports readiness when the database responds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await request(app).get("/api/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ready" } });
  });

  it("returns 503 without leaking details when the database is down", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(app).get("/api/health/ready");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("10.0.0.5");
  });
});
