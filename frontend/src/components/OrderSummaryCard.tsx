import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { formatPaise } from "@/utils/currency";
import { useOrderPayment } from "@/hooks/useOrderPayment";
import type { OrderDTO } from "@/types/api";

export function OrderSummaryCard({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { payForOrder, state, error } = useOrderPayment();

  useEffect(() => {
    let cancelled = false;
    api
      .get<OrderDTO>(`/api/orders/${orderId}`)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load this order.");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loadError) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }

  if (!order) {
    return <p className="text-sm text-ink-muted">Loading order…</p>;
  }

  const isBusy = state === "creating" || state === "awaiting_checkout" || state === "verifying";

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">Order summary — pending confirmation</p>
      <ul className="mt-3 space-y-2">
        {order.items.map((item) => (
          <li key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="font-mono">{formatPaise(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Subtotal</span>
          <span className="font-mono">{formatPaise(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-muted">
          <span>Shipping</span>
          <span className="font-mono">{order.shipping === 0 ? "Free" : formatPaise(order.shipping)}</span>
        </div>
        <div className="flex justify-between font-medium text-ink">
          <span>Total</span>
          <span className="font-mono">{formatPaise(order.total)}</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        onClick={() => payForOrder(order.id)}
        disabled={isBusy || order.status !== "PENDING"}
        className="mt-4 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {order.status !== "PENDING"
          ? `Order ${order.status.toLowerCase()}`
          : isBusy
          ? "Processing…"
          : `Confirm & Pay ${formatPaise(order.total)}`}
      </button>
      <p className="mt-2 text-xs text-ink-muted">
        This charges a Razorpay Test Mode payment — no real money moves.
      </p>
    </div>
  );
}
