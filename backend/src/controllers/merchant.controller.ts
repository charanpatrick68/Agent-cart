import { Request, Response } from "express";
import * as merchantService from "@/services/merchantService";
import { listRecentAuditLogs } from "@/services/auditService";
import { prisma } from "@/config/prisma";

export async function getOverview(_req: Request, res: Response) {
  const [revenue, agentMetrics] = await Promise.all([
    merchantService.getRevenueOverview(),
    merchantService.getAgentCommerceMetrics(),
  ]);
  res.json({ revenue, agentMetrics });
}

export async function getRecentActivity(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await listRecentAuditLogs(limit);
  res.json({ logs });
}

export async function listOrders(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: { include: { product: true } } },
  });
  res.json({
    orders: orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      itemCount: o.items.length,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
