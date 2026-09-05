import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { createPayment, verifyPayment, abandonPayment } from "@/controllers/payment.controller";

export const paymentRouter = Router();

paymentRouter.post("/create", asyncHandler(createPayment));
paymentRouter.post("/verify", asyncHandler(verifyPayment));
paymentRouter.post("/abandon", asyncHandler(abandonPayment));
