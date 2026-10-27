import { env } from "@/config/env";
import { prisma } from "@/config/prisma";
import { createApp } from "@/app";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`AgentCart backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Let in-flight requests finish when the host restarts or redeploys us.
function shutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
