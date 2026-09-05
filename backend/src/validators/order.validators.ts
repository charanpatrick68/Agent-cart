import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1, "An order needs at least one item"),
  sessionId: z.string().trim().min(1).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderIdParamSchema = z.object({
  id: z.string().trim().min(1, "order id is required"),
});
