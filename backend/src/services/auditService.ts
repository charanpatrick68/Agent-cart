import { prisma } from "@/config/prisma";

export type AuditLogEntry = {
  sessionId?: string;
  action: string;
  input: unknown;
  output: unknown;
  reasoning?: string;
  success: boolean;
};

export async function logAction(entry: AuditLogEntry): Promise<void> {
  // Audit logging must never itself take down a user-facing request. If
  // the write fails, log server-side and continue — losing one audit row
  // is far better than failing the shopping flow because of it.
  try {
    await prisma.auditLog.create({
      data: {
        sessionId: entry.sessionId,
        action: entry.action,
        input: entry.input as any,
        output: entry.output as any,
        reasoning: entry.reasoning,
        success: entry.success,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export type AuditLogDTO = {
  id: string;
  sessionId: string | null;
  action: string;
  input: unknown;
  output: unknown;
  reasoning: string | null;
  success: boolean;
  createdAt: string;
};

export async function listRecentAuditLogs(limit = 50): Promise<AuditLogDTO[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r: any) => ({
    id: r.id,
    sessionId: r.sessionId,
    action: r.action,
    input: r.input,
    output: r.output,
    reasoning: r.reasoning,
    success: r.success,
    createdAt: r.createdAt.toISOString ? r.createdAt.toISOString() : r.createdAt,
  }));
}

export async function listAuditLogsForSession(sessionId: string): Promise<AuditLogDTO[]> {
  const rows = await prisma.auditLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    sessionId: r.sessionId,
    action: r.action,
    input: r.input,
    output: r.output,
    reasoning: r.reasoning,
    success: r.success,
    createdAt: r.createdAt.toISOString ? r.createdAt.toISOString() : r.createdAt,
  }));
}
