import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth } from "@/middleware/auth";
import { login, me, register } from "@/controllers/auth.controller";

export const authRouter = Router();

// Slows down password guessing and mass sign-ups from a single IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes and try again." },
  },
});

authRouter.post("/register", authLimiter, asyncHandler(register));
authRouter.post("/login", authLimiter, asyncHandler(login));
authRouter.get("/me", asyncHandler(requireAuth), asyncHandler(me));
