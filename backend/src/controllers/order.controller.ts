import { Request, Response } from "express";
import { createOrderSchema, orderIdParamSchema } from "@/validators/order.validators";
import * as orderService from "@/services/orderService";
import { currentUser } from "@/middleware/auth";
import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/errorHandler";
import { parseOrThrow } from "@/utils/validate";

export async function createOrder(req: Request, res: Response) {
  const user = currentUser(req);
  const input = parseOrThrow(createOrderSchema, req.body);

  // An order can only be attached to one of the caller's own agent sessions.
  if (input.sessionId) {
    const session = await prisma.agentSession.findFirst({ where: { id: input.sessionId, userId: user.id } });
    if (!session) throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
  }

  const order = await orderService.createPendingOrder({ ...input, userId: user.id });
  res.status(201).json(order);
}

export async function listMyOrders(req: Request, res: Response) {
  const user = currentUser(req);
  const orders = await orderService.listOrdersForUser(user.id);
  res.json({ orders });
}

export async function getOrder(req: Request, res: Response) {
  const user = currentUser(req);
  const { id } = parseOrThrow(orderIdParamSchema, req.params);
  const order = await orderService.getOrderForUser(id, user.id);
  res.json(order);
}
