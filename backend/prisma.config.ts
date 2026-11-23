import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

// The single .env lives at the repository root.
loadDotenv({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations should use a direct connection when one is provided (Neon);
    // locally DIRECT_URL is unset and DATABASE_URL is used.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
