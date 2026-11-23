import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// The single .env lives at the repository root. On Vercel there is no file;
// the variables come from the project settings and this call is a no-op.
loadDotenv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine((value) => !value.startsWith("replace-with"), {
      message: "JWT_SECRET is still the placeholder from .env.example",
    }),
  JWT_EXPIRES_IN_HOURS: z.coerce.number().int().positive().max(168).default(24),
  AUTH_COOKIE_NAME: z.string().min(1).default("joineazy_session"),
  // Origin the browser app is served from during development. In production the
  // request's own host is accepted as well, so this only matters locally.
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Log field names and messages only; never echo the values.
  console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
