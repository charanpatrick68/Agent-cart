import { Request, Response } from "express";
import { AppError } from "@/middleware/errorHandler";
import { chatMessageSchema } from "@/validators/chat.validators";
import { runAgentTurn } from "@/agent/orchestrator";
import { listAuditLogsForSession } from "@/services/auditService";
import { prisma } from "@/config/prisma";
import { currentUser } from "@/middleware/auth";
import { parseOrThrow } from "@/utils/validate";

/** 404 unless the session exists and belongs to the signed-in user. */
async function assertSessionOwner(sessionId: string, userId: string) {
  const session = await prisma.agentSession.findFirst({ where: { id: sessionId, userId }, select: { id: true } });
  if (!session) throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
}

export async function sendMessage(req: Request, res: Response) {
  const user = currentUser(req);
  const { message, sessionId } = parseOrThrow(chatMessageSchema, req.body);
  const result = await runAgentTurn(message, { userId: user.id, sessionId });
  res.json(result);
}

export async function getSessionHistory(req: Request, res: Response) {
  const user = currentUser(req);
  const sessionId = String(req.params.sessionId);
  await assertSessionOwner(sessionId, user.id);
  const messages = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ sessionId, messages });
}

export async function getSessionAuditTrail(req: Request, res: Response) {
  const user = currentUser(req);
  const sessionId = String(req.params.sessionId);
  await assertSessionOwner(sessionId, user.id);
  const logs = await listAuditLogsForSession(sessionId);
  res.json({ sessionId, logs });
}
