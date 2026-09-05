import { prisma } from "@/config/prisma";
import type { OfferDTO } from "@/types/product";

function toOfferDTO(offer: {
  id: string;
  description: string;
  discountPct: number | null;
  discountFlat: number | null;
  validUntil: Date | null;
}): OfferDTO {
  return {
    id: offer.id,
    description: offer.description,
    discountPct: offer.discountPct,
    discountFlat: offer.discountFlat,
    validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
  };
}

/**
 * Returns only offers that are currently active AND not expired. The AI
 * agent must never invent a discount — this is the single place offers
 * are read from, and it enforces both flags itself rather than trusting
 * a caller to filter correctly.
 */
export async function getActiveOffersForProduct(productId: string): Promise<OfferDTO[]> {
  const map = await getActiveOffersForProducts([productId]);
  return map.get(productId) ?? [];
}

/**
 * Batch variant so listing N products in search results doesn't require
 * N separate offer queries. Same active/not-expired rule as the single
 * variant above — this stays the one place that rule is enforced.
 */
export async function getActiveOffersForProducts(productIds: string[]): Promise<Map<string, OfferDTO[]>> {
  const map = new Map<string, OfferDTO[]>();
  if (productIds.length === 0) return map;

  const offers = await prisma.offer.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  for (const offer of offers) {
    const list = map.get(offer.productId) ?? [];
    list.push(toOfferDTO(offer));
    map.set(offer.productId, list);
  }

  return map;
}
