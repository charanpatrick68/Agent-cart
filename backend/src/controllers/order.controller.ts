import { Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "@/middleware/errorHandler";
import { createOrderSchema, orderIdParamSchema } from "@/validators/order.validators";
import * as orderService from "@/services/orderService";

function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues.map((i) => i.message).join("; "), "VALIDATION_ERROR");
  }
  return parsed.data;
}

export async function createOrder(req: Request, res: Response) {
  const input = parseOrThrow(createOrderSchema, req.body);
  const order = await orderService.createPendingOrder(input);
  res.status(201).json(order);
}

export async function getOrder(req: Request, res: Response) {
  const { id } = parseOrThrow(orderIdParamSchema, req.params);
  const order = await orderService.getOrderById(id);
  res.json(order);
}
