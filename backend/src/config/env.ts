import "dotenv/config";

import { z } from "zod";

// Fail fast at boot if required configuration is missing.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Groq configuration
  GROQ_API_KEY: z.string().optional(),

  GROQ_MODEL: z
    .string()
    .default("openai/gpt-oss-20b"),

  RAZORPAY_KEY_ID: z.string().optional(),

  RAZORPAY_KEY_SECRET: z.string().optional(),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Non-fatal warning for the agent.
if (!env.GROQ_API_KEY) {
  console.warn(
    "⚠️ GROQ_API_KEY is not set — the shopping agent endpoints will fail until it is."
  );
}

// Non-fatal warning for payments.
if (
  !env.RAZORPAY_KEY_ID ||
  !env.RAZORPAY_KEY_SECRET
) {
  console.warn(
    "⚠️ Razorpay Test Mode keys are not set — payment endpoints will fail until they are."
  );
}