import { z } from "zod";
import { AppError } from "./app-error.js";

/** Parses untrusted input, throwing a 400 with field-level messages on failure. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      z.flattenError(result.error),
    );
  }
  return result.data;
}
