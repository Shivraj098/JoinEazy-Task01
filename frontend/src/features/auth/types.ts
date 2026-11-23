export type Role = "STUDENT" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  role: Role;
}

export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/admin" : "/student";
}
