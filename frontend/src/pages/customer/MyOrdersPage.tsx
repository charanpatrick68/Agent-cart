import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusPill } from "@/components/StatusPill";
import { ApiRequestError, api } from "@/services/api";
import { formatPaise } from "@/utils/currency";
import type { MyOrdersResponse, OrderDTO } from "@/types/api";

const TONE: Record<OrderDTO["status"], "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success",
  PENDING: "warning",
  PAYMENT_PENDING: "warning",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MyOrdersResponse>("/api/orders")
      .then((res) => {
        if (!cancelled) setOrders(res.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : "Couldn't load your orders.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader widthClass="max-w-3xl" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl text-ink">My orders</h1>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!orders && !error && <p className="mt-4 text-sm text-ink-muted">Loading your orders…</p>}

        {orders && orders.length === 0 && (
          <div className="mt-8 rounded-lg border border-line bg-paper-raised p-8 text-center">
            <p className="text-ink">You haven't placed any orders yet.</p>
            <Link to="/shop" className="mt-3 inline-block text-sm text-accent hover:underline">
              Ask the shopping agent for a recommendation →
            </Link>
          </div>
        )}

        {orders && orders.length > 0 && (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/payment/${o.id}`}
                  className="block rounded-lg border border-line bg-paper-raised p-4 hover:border-ink/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-ink-muted">
                      #{o.id.slice(0, 10)} · {new Date(o.createdAt).toLocaleDateString()}
                    </span>
                    <StatusPill tone={TONE[o.status]}>{o.status.replace("_", " ").toLowerCase()}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                  </p>
                  <p className="mt-1 font-mono text-sm text-ink">{formatPaise(o.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
