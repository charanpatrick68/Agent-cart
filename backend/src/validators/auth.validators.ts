import { z } from "zod";

// bcrypt only uses the first 72 bytes of a password, so reject longer ones
// instead of silently truncating them.
const password = z
  .string()
  .min(8, "must be at least 8 characters")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "must be at most 72 bytes");

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("must be a valid email address"));

export const registerSchema = z.object({
  name: z.string().trim().min(1, "is required").max(80),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  // Don't apply the strength rules on login — just require something.
  password: z.string().min(1, "is required").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
