import { checkInventory } from "@/services/inventoryService";
import { AppError } from "@/middleware/errorHandler";

export async function checkInventoryTool(rawInput: any) {
  const productId = rawInput?.productId;
  if (!productId || typeof productId !== "string") {
    return { error: "productId is required" };
  }
  try {
    return await checkInventory(productId);
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }
}
