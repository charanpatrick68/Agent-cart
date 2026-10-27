import { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "@/middleware/errorHandler";
import { getUserById, verifyToken } from "@/services/authService";

/**
 * Requires a valid `Authorization: Bearer <jwt>` header and attaches the
 * current user to `req.user`. The user is re-read from the database on every
 * request so deleted accounts and role changes take effect immediately
 * instead of when the token expires.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!token) throw new AppError(401, "Please sign in to continue", "UNAUTHENTICATED");

  const userId = verifyToken(token);
  if (!userId) throw new AppError(401, "Your session has expired. Please sign in again.", "INVALID_TOKEN");

  const user = await getUserById(userId);
  if (!user) throw new AppError(401, "Your session has expired. Please sign in again.", "INVALID_TOKEN");

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

/** Must run after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, "Please sign in to continue", "UNAUTHENTICATED");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "You don't have permission to do that", "FORBIDDEN");
    }
    next();
  };
}

/** For handlers that run behind requireAuth — narrows `req.user` to defined. */
export function currentUser(req: Request) {
  if (!req.user) throw new AppError(401, "Please sign in to continue", "UNAUTHENTICATED");
  return req.user;
}
