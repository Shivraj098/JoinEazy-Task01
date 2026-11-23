import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyAgainstDecoy, verifyPassword } from "../../lib/password.js";
import type { AuthUser } from "../../types/auth.js";
import { AppError } from "../../utils/app-error.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

const userSelect = { id: true, name: true, email: true, studentId: true, role: true } as const;

function emailTaken() {
  return new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.", {
    formErrors: [],
    fieldErrors: { email: ["An account with this email already exists."] },
  });
}

function studentIdTaken() {
  return new AppError(409, "STUDENT_ID_TAKEN", "This student ID is already registered.", {
    formErrors: [],
    fieldErrors: { studentId: ["This student ID is already registered."] },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/** Public registration always creates a STUDENT; the role is never taken from input. */
export async function registerStudent(input: RegisterInput): Promise<AuthUser> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { studentId: input.studentId }] },
    select: { email: true, studentId: true },
  });
  if (existing) throw existing.email === input.email ? emailTaken() : studentIdTaken();

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        studentId: input.studentId,
        passwordHash,
        role: "STUDENT",
      },
      select: userSelect,
    });
  } catch (error) {
    // Two registrations racing past the check above are stopped by the unique indexes.
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "ALREADY_REGISTERED",
        "This email or student ID is already registered.",
      );
    }
    throw error;
  }
}

export async function verifyCredentials(input: LoginInput): Promise<AuthUser> {
  const invalid = () => new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...userSelect, passwordHash: true },
  });

  if (!user) {
    await verifyAgainstDecoy(input.password);
    throw invalid();
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) throw invalid();

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
  };
}
