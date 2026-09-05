import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendMessage, getSessionHistory, getSessionAuditTrail } from "@/controllers/chat.controller";

export const chatRouter = Router();

chatRouter.post("/", asyncHandler(sendMessage));
chatRouter.get("/:sessionId/history", asyncHandler(getSessionHistory));
chatRouter.get("/:sessionId/audit", asyncHandler(getSessionAuditTrail));
