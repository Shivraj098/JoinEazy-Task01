export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Official student IDs are compared trimmed and uppercased. */
export function normalizeStudentId(value: string): string {
  return value.trim().toUpperCase();
}
