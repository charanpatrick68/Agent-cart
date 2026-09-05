import { PrismaClient } from "@prisma/client";

// A single shared Prisma client instance. In dev with ts-node-dev's hot
// reload, we stash it on `global` to avoid exhausting Postgres connections
// across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  global.__prisma__ = prisma;
}
