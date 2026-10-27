import { ZodType } from "zod";
import { AppError } from "@/middleware/errorHandler";

/** Parses untrusted input with a Zod schema or throws a 400 AppError. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new AppError(400, message || "Invalid request", "VALIDATION_ERROR");
  }
  return parsed.data;
}
