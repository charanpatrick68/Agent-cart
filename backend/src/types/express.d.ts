import type { Role } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth. Loaded fresh from the database on every request. */
      user?: { id: string; name: string; email: string; role: Role };
    }
  }
}

export {};
