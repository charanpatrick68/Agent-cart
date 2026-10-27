import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth } from "@/middleware/auth";
import { sendMessage, getSessionHistory, getSessionAuditTrail } from "@/controllers/chat.controller";

export const chatRouter = Router();

chatRouter.use(asyncHandler(requireAuth));

// Every message is a paid LLM call, so cap how fast one account can send them.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  validate: { keyGeneratorIpFallback: false },
  skip: () => env.NODE_ENV === "test",
  message: {
    error: { code: "RATE_LIMITED", message: "You're sending messages too quickly. Please wait a moment." },
  },
});

chatRouter.post("/", chatLimiter, asyncHandler(sendMessage));
chatRouter.get("/:sessionId/history", asyncHandler(getSessionHistory));
chatRouter.get("/:sessionId/audit", asyncHandler(getSessionAuditTrail));
