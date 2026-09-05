import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/errorHandler";

export type InventoryStatus = {
  productId: string;
  quantity: number;
  inStock: boolean;
};

/**
 * The agent must never assume a product is available. This is the only
 * function (used both by the REST API and the `check_inventory` agent
 * tool) that answers "is this in stock" — it always reads the current
 * row from Postgres, never a cached or model-provided value.
 */
export async function checkInventory(productId: string): Promise<InventoryStatus> {
  const inventory = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    throw new AppError(404, `No inventory record for product ${productId}`, "PRODUCT_NOT_FOUND");
  }

  return {
    productId,
    quantity: inventory.quantity,
    inStock: inventory.quantity > 0,
  };
}

/**
 * Batch variant used by search results, so listing 20 products doesn't
 * require 20 separate round trips.
 */
export async function checkInventoryBatch(productIds: string[]): Promise<Map<string, InventoryStatus>> {
  const rows = await prisma.inventory.findMany({
    where: { productId: { in: productIds } },
  });

  const map = new Map<string, InventoryStatus>();
  for (const row of rows) {
    map.set(row.productId, {
      productId: row.productId,
      quantity: row.quantity,
      inStock: row.quantity > 0,
    });
  }
  return map;
}
