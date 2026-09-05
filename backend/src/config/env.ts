import "dotenv/config";
import { z } from "zod";

// Fail fast at boot if required configuration is missing, rather than
// discovering it mid-request (e.g. a payment call silently going to the
// wrong place because an env var was empty).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Non-fatal warnings for features that are optional at boot but required
// for specific flows (agent chat, payments) to actually work.
if (!env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set — the shopping agent endpoints will fail until it is.");
}
if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️  Razorpay Test Mode keys are not set — payment endpoints will fail until they are.");
}
