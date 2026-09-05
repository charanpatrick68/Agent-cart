import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiRequestError } from "@/services/api";
import { openRazorpayCheckout } from "@/services/razorpay";
import type { CreatePaymentResponse, VerifyPaymentResponse } from "@/types/api";

export type PaymentFlowState = "idle" | "creating" | "awaiting_checkout" | "verifying" | "error";

export function useOrderPayment() {
  const [state, setState] = useState<PaymentFlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const payForOrder = useCallback(
    async (orderId: string) => {
      setError(null);
      setState("creating");
      try {
        // Backend re-validates price/inventory here — this call can fail
        // (409) if the catalog changed since the order was created.
        const payment = await api.post<CreatePaymentResponse>("/api/payments/create", { orderId });

        setState("awaiting_checkout");
        await openRazorpayCheckout({
          keyId: payment.keyId,
          razorpayOrderId: payment.razorpayOrderId,
          amount: payment.amount,
          currency: payment.currency,
          description: "AgentCart order",
          onSuccess: async (result) => {
            setState("verifying");
            try {
              await api.post<VerifyPaymentResponse>("/api/payments/verify", {
                orderId,
                razorpay_order_id: result.razorpay_order_id,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
              });
              setState("idle");
              navigate(`/payment/${orderId}`);
            } catch (err) {
              setState("error");
              setError(err instanceof ApiRequestError ? err.message : "Payment verification failed");
              navigate(`/payment/${orderId}`);
            }
          },
          onDismiss: async () => {
            // User closed the checkout without completing it — mark the
            // order failed/retryable rather than leaving it ambiguous.
            try {
              await api.post("/api/payments/abandon", { orderId });
            } finally {
              setState("idle");
              navigate(`/payment/${orderId}`);
            }
          },
        });
      } catch (err) {
        setState("error");
        setError(err instanceof ApiRequestError ? err.message : "Could not start payment");
      }
    },
    [navigate]
  );

  return { payForOrder, state, error };
}
