import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "@/config/env";
import { AppError } from "@/middleware/errorHandler";
import { prisma } from "@/config/prisma";
import * as orderService from "@/services/orderService";

let razorpayClient: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, "Payments are not configured on this server yet.", "PAYMENTS_NOT_CONFIGURED");
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

export type CreatePaymentResult = {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  orderId: string; // our internal order id
};

/**
 * The most heavily restricted function in the system. Before ever calling
 * Razorpay, it re-validates the order server-side (status, current price,
 * current inventory — see orderService.revalidatePendingOrder). The caller
 * (including the agent) cannot pass an amount here; the amount charged is
 * always the order's own server-computed `total`.
 */
export async function createPayment(orderId: string): Promise<CreatePaymentResult> {
  const order = await orderService.revalidatePendingOrder(orderId);

  if (order.total <= 0) {
    throw new AppError(400, "Order total must be greater than zero", "INVALID_ORDER_TOTAL");
  }

  const client = getRazorpayClient();

  // Razorpay order receipts must be <= 40 chars.
  const receipt = `agentcart_${order.id}`.slice(0, 40);

  const razorpayOrder = await client.orders.create({
    amount: order.total, // paise — matches Order.total exactly, never a caller-supplied value
    currency: "INR",
    receipt,
    notes: { agentcartOrderId: order.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAYMENT_PENDING", razorpayOrderId: razorpayOrder.id },
  });

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: order.total,
    currency: "INR",
    keyId: env.RAZORPAY_KEY_ID!,
    orderId: order.id,
  };
}

export type VerifyPaymentInput = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

/**
 * The frontend reporting "payment succeeded" is never trusted on its own.
 * This recomputes the HMAC-SHA256 signature Razorpay expects
 * (razorpay_order_id + "|" + razorpay_payment_id, signed with our secret)
 * and only marks the order PAID if it matches exactly.
 */
export async function verifyPayment(input: VerifyPaymentInput): Promise<{ status: string; orderId: string }> {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, "Payments are not configured on this server yet.", "PAYMENTS_NOT_CONFIGURED");
  }

  const order = await orderService.getOrderById(input.orderId);

  // Idempotency: if this order was already marked PAID by an earlier call
  // (e.g. a retried request), just return the current state rather than
  // re-verifying and re-decrementing inventory.
  if (order.status === "PAID") {
    return { status: "PAID", orderId: order.id };
  }

  if (order.razorpayOrderId !== input.razorpayOrderId) {
    throw new AppError(400, "razorpay_order_id does not match this order", "ORDER_MISMATCH");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  const signatureValid =
    expectedSignature.length === input.razorpaySignature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(input.razorpaySignature));

  if (!signatureValid) {
    await orderService.markOrderFailed(order.id);
    throw new AppError(400, "Payment signature verification failed", "INVALID_SIGNATURE");
  }

  await orderService.markOrderPaid(order.id, input.razorpayPaymentId);
  return { status: "PAID", orderId: order.id };
}

/**
 * Called when the frontend reports the Razorpay checkout was cancelled or
 * timed out (not a signature-verification failure, just "didn't complete").
 * Leaves the order in a clearly failed, retryable state rather than PAID.
 */
export async function markPaymentAbandoned(orderId: string): Promise<{ status: string; orderId: string }> {
  const order = await orderService.getOrderById(orderId);
  if (order.status === "PAID") {
    // Don't downgrade an already-paid order just because the client
    // thinks the flow failed (e.g. a stale/duplicate client-side event).
    return { status: "PAID", orderId: order.id };
  }
  await orderService.markOrderFailed(orderId);
  return { status: "FAILED", orderId };
}
