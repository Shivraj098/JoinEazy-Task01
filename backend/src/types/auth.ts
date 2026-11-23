import type { Role } from "../generated/prisma/client.js";

/** The only user shape that is ever sent to clients or attached to a request. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  role: Role;
}
