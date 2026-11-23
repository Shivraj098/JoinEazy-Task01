import { hash } from "bcryptjs";
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createPrismaClient } from "../src/lib/create-prisma-client.js";

loadDotenv({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const seedEnv = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  ADMIN_NAME: z.string().trim().min(2).max(100),
  ADMIN_EMAIL: z.string().trim().pipe(z.email()),
  ADMIN_PASSWORD: z.string().min(8).max(72),
});

const parsed = seedEnv.safeParse(process.env);
if (!parsed.success) {
  console.error("Seed configuration is invalid:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

const { DATABASE_URL, DIRECT_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = parsed.data;
const prisma = createPrismaClient(DIRECT_URL ?? DATABASE_URL);

// Idempotent: creates the admin if missing, otherwise refreshes name and password.
async function main(): Promise<void> {
  const email = ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: ADMIN_NAME, passwordHash, role: "ADMIN", studentId: null },
    create: { name: ADMIN_NAME, email, passwordHash, role: "ADMIN" },
    select: { email: true },
  });
  console.log(`Admin account ready: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
