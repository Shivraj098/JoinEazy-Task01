import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret-that-is-at-least-thirty-two-chars",
      BCRYPT_ROUNDS: "4",
    },
  },
});
