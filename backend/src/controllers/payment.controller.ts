import { Request, Response } from "express";
import { createPaymentSchema, verifyPaymentSchema, abandonPaymentSchema } from "@/validators/payment.validators";
import * as paymentService from "@/services/paymentService";
import { currentUser } from "@/middleware/auth";
import { parseOrThrow } from "@/utils/validate";

// Called only when the user clicks "Confirm & Pay" in the UI — never by
// the agent. See docs/architecture.md for why this is a plain REST
// endpoint rather than an agent tool.
export async function createPayment(req: Request, res: Response) {
  const user = currentUser(req);
  const { orderId } = parseOrThrow(createPaymentSchema, req.body);
  const result = await paymentService.createPayment(orderId, user.id);
  res.json(result);
}

export async function verifyPayment(req: Request, res: Response) {
  const user = currentUser(req);
  const input = parseOrThrow(verifyPaymentSchema, req.body);
  const result = await paymentService.verifyPayment({
    userId: user.id,
    orderId: input.orderId,
    razorpayOrderId: input.razorpay_order_id,
    razorpayPaymentId: input.razorpay_payment_id,
    razorpaySignature: input.razorpay_signature,
  });
  res.json(result);
}

export async function abandonPayment(req: Request, res: Response) {
  const user = currentUser(req);
  const { orderId } = parseOrThrow(abandonPaymentSchema, req.body);
  const result = await paymentService.markPaymentAbandoned(orderId, user.id);
  res.json(result);
}
