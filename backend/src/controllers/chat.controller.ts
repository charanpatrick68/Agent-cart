import { Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "@/middleware/errorHandler";
import { chatMessageSchema } from "@/validators/chat.validators";
import { runAgentTurn } from "@/agent/orchestrator";
import { listAuditLogsForSession } from "@/services/auditService";
import { prisma } from "@/config/prisma";

function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues.map((i) => i.message).join("; "), "VALIDATION_ERROR");
  }
  return parsed.data;
}

export async function sendMessage(req: Request, res: Response) {
  const { message, sessionId } = parseOrThrow(chatMessageSchema, req.body);
  const result = await runAgentTurn(message, sessionId);
  res.json(result);
}

export async function getSessionHistory(req: Request, res: Response) {
  const sessionId = String(req.params.sessionId);
  const messages = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ sessionId, messages });
}

export async function getSessionAuditTrail(req: Request, res: Response) {
  const sessionId = String(req.params.sessionId);
  const logs = await listAuditLogsForSession(sessionId);
  res.json({ sessionId, logs });
}
