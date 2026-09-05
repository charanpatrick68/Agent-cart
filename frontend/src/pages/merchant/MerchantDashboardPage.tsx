import { useEffect, useState } from "react";
import { MerchantNav } from "@/components/MerchantNav";
import { StatCard } from "@/components/StatCard";
import { api } from "@/services/api";
import { formatPaise } from "@/utils/currency";
import type { MerchantOverview } from "@/types/api";

export function MerchantDashboardPage() {
  const [overview, setOverview] = useState<MerchantOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MerchantOverview>("/api/merchant/overview")
      .then(setOverview)
      .catch(() => setError("Couldn't load merchant metrics."));
  }, []);

  return (
    <div className="min-h-screen">
      <MerchantNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-2xl text-ink">Revenue overview</h1>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {overview && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="GMV" value={formatPaise(overview.revenue.gmv)} sub="sum of paid orders" />
              <StatCard label="Paid orders" value={String(overview.revenue.paidOrders)} />
              <StatCard label="Failed orders" value={String(overview.revenue.failedOrders)} />
              <StatCard label="Avg order value" value={formatPaise(overview.revenue.averageOrderValue)} />
            </div>

            <h2 className="mt-10 font-display text-2xl text-ink">AI commerce metrics</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Agent sessions" value={String(overview.agentMetrics.totalSessions)} />
              <StatCard label="Searches run" value={String(overview.agentMetrics.searchCalls)} />
              <StatCard label="Checkouts initiated" value={String(overview.agentMetrics.checkoutsInitiated)} />
              <StatCard label="Completed purchases" value={String(overview.agentMetrics.completedPurchases)} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <StatCard
                label="Tool call success rate"
                value={`${Math.round(overview.agentMetrics.toolCallSuccessRate * 100)}%`}
                sub="across all logged agent tool calls"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
