import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { createOrder, getOrder } from "@/controllers/order.controller";

export const orderRouter = Router();

orderRouter.post("/", asyncHandler(createOrder));
orderRouter.get("/:id", asyncHandler(getOrder));
