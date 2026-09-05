declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout script"));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export type OpenCheckoutParams = {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  name?: string;
  description?: string;
  onSuccess: (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onDismiss: () => void;
};

export async function openRazorpayCheckout(params: OpenCheckoutParams) {
  await loadCheckoutScript();

  const rzp = new window.Razorpay({
    key: params.keyId,
    amount: params.amount,
    currency: params.currency,
    order_id: params.razorpayOrderId,
    name: params.name ?? "AgentCart",
    description: params.description ?? "Order payment",
    handler: (response: any) => {
      params.onSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => params.onDismiss(),
    },
    theme: { color: "#3346e0" },
  });

  rzp.open();
}
