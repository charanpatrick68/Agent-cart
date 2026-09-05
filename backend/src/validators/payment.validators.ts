import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().trim().min(1, "orderId is required"),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export const abandonPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
});
