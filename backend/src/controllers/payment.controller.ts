import { Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "@/middleware/errorHandler";
import { createPaymentSchema, verifyPaymentSchema, abandonPaymentSchema } from "@/validators/payment.validators";
import * as paymentService from "@/services/paymentService";

function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues.map((i) => i.message).join("; "), "VALIDATION_ERROR");
  }
  return parsed.data;
}

// Called only when the user clicks "Confirm & Pay" in the UI — never by
// the agent. See docs/architecture.md for why this is a plain REST
// endpoint rather than an agent tool.
export async function createPayment(req: Request, res: Response) {
  const { orderId } = parseOrThrow(createPaymentSchema, req.body);
  const result = await paymentService.createPayment(orderId);
  res.json(result);
}

export async function verifyPayment(req: Request, res: Response) {
  const input = parseOrThrow(verifyPaymentSchema, req.body);
  const result = await paymentService.verifyPayment({
    orderId: input.orderId,
    razorpayOrderId: input.razorpay_order_id,
    razorpayPaymentId: input.razorpay_payment_id,
    razorpaySignature: input.razorpay_signature,
  });
  res.json(result);
}

export async function abandonPayment(req: Request, res: Response) {
  const { orderId } = parseOrThrow(abandonPaymentSchema, req.body);
  const result = await paymentService.markPaymentAbandoned(orderId);
  res.json(result);
}
