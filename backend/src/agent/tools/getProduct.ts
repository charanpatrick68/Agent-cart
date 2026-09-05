import { getProductById } from "@/services/catalogService";
import { AppError } from "@/middleware/errorHandler";

export async function getProductTool(rawInput: any) {
  const productId = rawInput?.productId;
  if (!productId || typeof productId !== "string") {
    return { error: "productId is required" };
  }
  try {
    const product = await getProductById(productId);
    return product;
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    throw err;
  }
}
