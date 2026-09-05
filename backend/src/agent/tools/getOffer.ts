import { getActiveOffersForProduct } from "@/services/offerService";

export async function getOfferTool(rawInput: any) {
  const productId = rawInput?.productId;
  if (!productId || typeof productId !== "string") {
    return { error: "productId is required" };
  }
  const offers = await getActiveOffersForProduct(productId);
  return { productId, offers };
}
