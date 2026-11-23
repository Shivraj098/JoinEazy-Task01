import { z } from "zod";
import { normalizeEmail, normalizeStudentId } from "../../utils/normalize.js";

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"))
  .transform(normalizeEmail);

// bcrypt only uses the first 72 bytes, so longer passwords are rejected outright.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, {
    message: "Password must be at most 72 bytes",
  });

// Strict: unknown keys such as `role` are rejected rather than silently ignored.
export const registerSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email,
  studentId: z
    .string()
    .trim()
    .min(1, "Student ID is required")
    .max(64, "Student ID must be at most 64 characters")
    .transform(normalizeStudentId),
  password,
});

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
