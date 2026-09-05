import { prisma } from "@/config/prisma";

export type RevenueOverview = {
  gmv: number; // paise, sum of PAID orders
  totalOrders: number;
  paidOrders: number;
  failedOrders: number;
  averageOrderValue: number; // paise
};

export async function getRevenueOverview(): Promise<RevenueOverview> {
  const [totalOrders, paidAgg, failedOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { status: "FAILED" } }),
  ]);

  const paidOrders = paidAgg._count._all;
  const gmv = paidAgg._sum.total ?? 0;

  return {
    gmv,
    totalOrders,
    paidOrders,
    failedOrders,
    averageOrderValue: paidOrders > 0 ? Math.round(gmv / paidOrders) : 0,
  };
}

export type AgentCommerceMetrics = {
  totalSessions: number;
  searchCalls: number;
  checkoutsInitiated: number; // create_pending_order calls that succeeded
  completedPurchases: number; // orders that reached PAID
  toolCallSuccessRate: number; // 0-1, over all logged tool calls
};

export async function getAgentCommerceMetrics(): Promise<AgentCommerceMetrics> {
  const [totalSessions, searchCalls, checkoutsInitiated, completedPurchases, totalToolCalls, successfulToolCalls] =
    await Promise.all([
      prisma.agentSession.count(),
      prisma.auditLog.count({ where: { action: "search_products" } }),
      prisma.auditLog.count({ where: { action: "create_pending_order", success: true } }),
      prisma.order.count({ where: { status: "PAID", sessionId: { not: null } } }),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { success: true } }),
    ]);

  return {
    totalSessions,
    searchCalls,
    checkoutsInitiated,
    completedPurchases,
    toolCallSuccessRate: totalToolCalls > 0 ? successfulToolCalls / totalToolCalls : 0,
  };
}
