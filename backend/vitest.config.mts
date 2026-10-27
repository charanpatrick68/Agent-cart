import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The tests run the real Express app against an in-memory fake of the
    // Prisma client, so they need no database, API keys or network.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused",
      JWT_SECRET: "test-secret-test-secret-test-secret-123",
      RAZORPAY_KEY_ID: "rzp_test_dummy",
      RAZORPAY_KEY_SECRET: "razorpay_test_secret",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
