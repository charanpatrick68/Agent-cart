import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/errorHandler";
import { getActiveOffersForProducts } from "@/services/offerService";

export type OrderItemInput = {
  productId: string;
  quantity: number;
};

export type OrderLineDTO = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // paise, server-computed at creation time
  lineTotal: number;
};

export type OrderDTO = {
  id: string;
  status: string;
  items: OrderLineDTO[];
  subtotal: number;
  shipping: number;
  total: number;
  razorpayOrderId: string | null;
  createdAt: string;
};

const FLAT_SHIPPING = 0; // free shipping for the demo catalog; kept explicit rather than implicit

function toOrderDTO(order: any): OrderDTO {
  return {
    id: order.id,
    status: order.status,
    items: order.items.map((item: any) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    razorpayOrderId: order.razorpayOrderId,
    createdAt: order.createdAt.toISOString ? order.createdAt.toISOString() : order.createdAt,
  };
}

/**
 * Creates a PENDING order. This is the "backend validates" step: for every
 * requested line item, it re-reads the product from Postgres (never trusts
 * a price or "it's in stock" claim from the caller — including the agent),
 * confirms the product is active and has enough inventory, and computes
 * the total itself. Nothing here charges the user or touches Razorpay.
 */
export async function createPendingOrder(params: {
  items: OrderItemInput[];
  sessionId?: string;
  userId?: string;
}): Promise<OrderDTO> {
  const { items, sessionId, userId } = params;

  if (!items || items.length === 0) {
    throw new AppError(400, "An order needs at least one item", "EMPTY_ORDER");
  }

  // Reject nonsensical/duplicate requests before hitting the DB.
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.productId || item.quantity <= 0) {
      throw new AppError(400, "Each item needs a productId and a positive quantity", "INVALID_ORDER_ITEM");
    }
    if (seen.has(item.productId)) {
      throw new AppError(400, `Duplicate line item for product ${item.productId} — combine quantities instead`, "DUPLICATE_LINE_ITEM");
    }
    seen.add(item.productId);
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { inventory: true },
  });

  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const offersByProduct = await getActiveOffersForProducts(productIds);

  let subtotal = 0;
  const orderItemsData: { productId: string; quantity: number; unitPrice: number }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId) as any;

    if (!product || !product.isActive) {
      throw new AppError(404, `Product ${item.productId} does not exist or is no longer sold`, "PRODUCT_NOT_FOUND");
    }

    const available = product.inventory?.quantity ?? 0;
    if (available < item.quantity) {
      throw new AppError(
        409,
        `Only ${available} of "${product.name}" left in stock (requested ${item.quantity})`,
        "INSUFFICIENT_STOCK"
      );
    }

    // Apply the best currently-active offer for this product, if any.
    // Never invented — pulled from the same source get_offer reads from.
    const offers = offersByProduct.get(product.id) ?? [];
    let unitPrice = product.price;
    for (const offer of offers) {
      let discounted = unitPrice;
      if (offer.discountPct != null) discounted = Math.round(unitPrice * (1 - offer.discountPct / 100));
      if (offer.discountFlat != null) discounted = Math.min(discounted, unitPrice - offer.discountFlat);
      unitPrice = Math.max(0, Math.min(unitPrice, discounted));
    }

    subtotal += unitPrice * item.quantity;
    orderItemsData.push({ productId: product.id, quantity: item.quantity, unitPrice });
  }

  const total = subtotal + FLAT_SHIPPING;

  const order = await prisma.order.create({
    data: {
      userId,
      sessionId,
      status: "PENDING",
      subtotal,
      shipping: FLAT_SHIPPING,
      total,
      items: { create: orderItemsData },
    },
    include: { items: { include: { product: true } } },
  });

  return toOrderDTO(order);
}

export async function getOrderById(orderId: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    throw new AppError(404, `Order ${orderId} not found`, "ORDER_NOT_FOUND");
  }

  return toOrderDTO(order);
}

/**
 * Re-validates a PENDING order immediately before payment is initiated —
 * confirming current prices and stock still match what the order was
 * created with. If the catalog changed in between (price update, someone
 * else bought the last unit), this throws rather than silently charging
 * a stale amount.
 */
export async function revalidatePendingOrder(orderId: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });

  if (!order) {
    throw new AppError(404, `Order ${orderId} not found`, "ORDER_NOT_FOUND");
  }
  if (order.status !== "PENDING") {
    throw new AppError(409, `Order ${orderId} is not awaiting payment (status: ${order.status})`, "INVALID_ORDER_STATE");
  }

  for (const item of order.items as any[]) {
    const product = item.product;
    if (!product.isActive) {
      throw new AppError(409, `"${product.name}" is no longer available`, "PRODUCT_UNAVAILABLE");
    }
    const available = product.inventory?.quantity ?? 0;
    if (available < item.quantity) {
      throw new AppError(409, `Only ${available} of "${product.name}" left in stock`, "INSUFFICIENT_STOCK");
    }
    if (product.price !== item.unitPrice) {
      // Price drifted since the order was created — fail closed rather
      // than silently charging either the old or new price.
      throw new AppError(
        409,
        `The price of "${product.name}" has changed. Please recreate the order.`,
        "PRICE_CHANGED"
      );
    }
  }

  return toOrderDTO(order);
}

/**
 * Called only after a verified successful payment. Marks the order PAID
 * and decrements inventory in the same transaction, so a paid order can
 * never leave stock counts inconsistent.
 */
export async function markOrderPaid(orderId: string, razorpayPaymentId: string): Promise<OrderDTO> {
  const orderId_ = await prisma.$transaction(async (tx: any) => {
    const existing = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, `Order ${orderId} not found`, "ORDER_NOT_FOUND");

    // Idempotency: if this order is already PAID (e.g. a retried webhook
    // or duplicate confirm call), don't decrement inventory twice.
    if (existing.status === "PAID") return existing.id;

    for (const item of existing.items as any[]) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", razorpayPaymentId },
    });
    return updated.id;
  });

  return getOrderById(orderId_);
}

export async function markOrderFailed(orderId: string): Promise<OrderDTO> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: "FAILED" },
    include: { items: { include: { product: true } } },
  });
  return toOrderDTO(order);
}
