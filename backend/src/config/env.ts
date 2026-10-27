import "dotenv/config";

import { z } from "zod";

// Fail fast at boot if required configuration is missing or unsafe.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // LLM (Groq, via its OpenAI-compatible API)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),

  // Razorpay Test Mode
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // One or more allowed browser origins, comma separated.
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Set to the number of reverse proxies in front of the API (Render = 1) so
  // rate limiting sees the real client IP rather than the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

// A short or guessable signing secret lets anyone forge a MERCHANT token, so
// refuse to boot in production with a weak one.
if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters in production.");
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Non-fatal warning for the agent.
if (!env.GROQ_API_KEY) {
  console.warn("⚠️ GROQ_API_KEY is not set — the shopping agent endpoints will fail until it is.");
}

// Non-fatal warning for payments.
if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️ Razorpay Test Mode keys are not set — payment endpoints will fail until they are.");
}
