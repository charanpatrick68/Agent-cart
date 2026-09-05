import { createPendingOrder } from "@/services/orderService";
import { AppError } from "@/middleware/errorHandler";

export async function createPendingOrderTool(rawInput: any, ctx: { sessionId: string }) {
  const items = rawInput?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "items must be a non-empty array of { productId, quantity }" };
  }

  try {
    const order = await createPendingOrder({
      items: items.map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      sessionId: ctx.sessionId,
    });
    return {
      orderId: order.id,
      status: order.status,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      note: "This order is PENDING and has NOT been paid. The user must click Confirm & Pay in the UI to proceed.",
    };
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }
}
