import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth } from "@/middleware/auth";
import { createOrder, getOrder, listMyOrders } from "@/controllers/order.controller";

export const orderRouter = Router();

// Every order route needs a signed-in user, and handlers only ever touch
// orders owned by that user.
orderRouter.use(asyncHandler(requireAuth));

orderRouter.post("/", asyncHandler(createOrder));
orderRouter.get("/", asyncHandler(listMyOrders));
orderRouter.get("/:id", asyncHandler(getOrder));
