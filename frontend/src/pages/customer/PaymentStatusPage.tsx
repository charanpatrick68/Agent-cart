import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { formatPaise } from "@/utils/currency";
import { useOrderPayment } from "@/hooks/useOrderPayment";
import { StatusPill } from "@/components/StatusPill";
import type { OrderDTO } from "@/types/api";

const STATUS_COPY: Record<OrderDTO["status"], { tone: "success" | "warning" | "danger" | "neutral"; label: string; message: string }> = {
  PAID: {
    tone: "success",
    label: "paid",
    message: "Payment confirmed — the signature was verified server-side and your order is complete.",
  },
  PAYMENT_PENDING: {
    tone: "warning",
    label: "payment pending",
    message: "We're waiting on payment confirmation for this order.",
  },
  PENDING: {
    tone: "warning",
    label: "awaiting payment",
    message: "This order hasn't been paid yet.",
  },
  FAILED: {
    tone: "danger",
    label: "payment failed",
    message: "Payment wasn't completed. Your order has not been marked as paid — you can retry safely below.",
  },
  CANCELLED: {
    tone: "neutral",
    label: "cancelled",
    message: "This order was cancelled.",
  },
};

export function PaymentStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { payForOrder, state } = useOrderPayment();

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    api
      .get<OrderDTO>(`/api/orders/${orderId}`)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't find that order.");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link to="/shop" className="font-mono text-xs text-ink-muted hover:text-ink">
        ← back to shop
      </Link>

      {loadError && <p className="mt-6 text-sm text-danger">{loadError}</p>}

      {order && (
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-ink">Order {order.id.slice(0, 10)}</h1>
            <StatusPill tone={STATUS_COPY[order.status].tone}>{STATUS_COPY[order.status].label}</StatusPill>
          </div>
          <p className="mt-3 text-ink-muted">{STATUS_COPY[order.status].message}</p>

          <div className="mt-6 rounded-lg border border-line bg-paper-raised p-4">
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-mono">{formatPaise(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-medium text-ink">
              <span>Total</span>
              <span className="font-mono">{formatPaise(order.total)}</span>
            </div>
          </div>

          {(order.status === "FAILED" || order.status === "PENDING") && (
            <button
              onClick={() => payForOrder(order.id)}
              disabled={state !== "idle" && state !== "error"}
              className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry payment
            </button>
          )}

          {order.status === "PAID" && (
            <Link
              to="/shop"
              className="mt-6 block w-full rounded-md border border-line px-4 py-2.5 text-center text-sm font-medium text-ink hover:border-ink/40"
            >
              Continue shopping
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
