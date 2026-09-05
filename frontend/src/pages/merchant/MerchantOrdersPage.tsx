import { useEffect, useState } from "react";
import { MerchantNav } from "@/components/MerchantNav";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/services/api";
import { formatPaise } from "@/utils/currency";
import type { MerchantOrderSummary } from "@/types/api";

const TONE_BY_STATUS: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PAYMENT_PENDING: "warning",
  PENDING: "warning",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export function MerchantOrdersPage() {
  const [orders, setOrders] = useState<MerchantOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ orders: MerchantOrderSummary[] }>("/api/merchant/orders")
      .then((res) => setOrders(res.orders))
      .catch(() => setError("Couldn't load orders."));
  }, []);

  return (
    <div className="min-h-screen">
      <MerchantNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-2xl text-ink">Orders</h1>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {orders && (
          <div className="mt-6 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper-raised text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-paper-raised">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{o.id.slice(0, 12)}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={TONE_BY_STATUS[o.status] ?? "neutral"}>{o.status.toLowerCase()}</StatusPill>
                    </td>
                    <td className="px-4 py-3">{o.itemCount}</td>
                    <td className="px-4 py-3 font-mono">{formatPaise(o.total)}</td>
                    <td className="px-4 py-3 text-ink-muted">{new Date(o.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
