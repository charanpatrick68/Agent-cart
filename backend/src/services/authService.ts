import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "@/config/env";
import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/errorHandler";
import type { LoginInput, RegisterInput } from "@/validators/auth.validators";

const BCRYPT_COST = 12;

// Compared against when the email doesn't exist, so a login for an unknown
// email takes as long as one with a wrong password (no timing oracle).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthResult = { user: PublicUser; token: string };

type UserRow = { id: string; name: string; email: string; role: Role; createdAt: Date };

function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() };
}

export function signToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

/** Returns the user id from a valid token, or null if it is invalid/expired. */
export function verifyToken(token: string): string | null {
  try {
    // Pin the algorithm so a token signed with "none" or a different alg is rejected.
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Public sign-up always creates a CUSTOMER. MERCHANT accounts can only be
 * created by the seed script / a database admin — never through the API.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: "CUSTOMER" },
    });
    return { user: toPublicUser(user), token: signToken(user) };
  } catch (err: any) {
    // P2002 = unique constraint violation (also covers two simultaneous sign-ups).
    if (err?.code === "P2002") {
      throw new AppError(409, "An account with this email already exists", "EMAIL_TAKEN");
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    // Same message for "no such user" and "wrong password".
    throw new AppError(401, "Incorrect email or password", "INVALID_CREDENTIALS");
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { id } });
}

export { toPublicUser };
