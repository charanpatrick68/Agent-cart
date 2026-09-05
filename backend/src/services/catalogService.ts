import { prisma } from "@/config/prisma";
import { AppError } from "@/middleware/errorHandler";
import { getActiveOffersForProducts } from "@/services/offerService";
import type { SearchProductsQuery } from "@/validators/product.validators";
import type { ProductDTO, ProductSearchResult } from "@/types/product";

// A local, explicit shape for "a product row with its inventory joined in" —
// describing exactly the fields this service selects, rather than reaching
// into Prisma's generated `Prisma.ProductGetPayload<...>` utility type. This
// keeps the service decoupled from Prisma's generated-namespace internals
// and easy to read in isolation.
type ProductRow = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  description: string;
  attributes: unknown;
  imageUrl: string | null;
  inventory: { quantity: number } | null;
};

function toProductDTO(product: ProductRow, offers: ProductDTO["offers"]): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    price: product.price,
    description: product.description,
    attributes: (product.attributes ?? {}) as Record<string, unknown>,
    imageUrl: product.imageUrl,
    inventory: {
      // A missing inventory row is a data-integrity edge case (every seeded
      // product has one), not a reason to crash a listing — treat it as
      // "not available" rather than throwing, so one bad row can't break
      // the whole search response.
      quantity: product.inventory?.quantity ?? 0,
      inStock: (product.inventory?.quantity ?? 0) > 0,
    },
    offers,
  };
}

/**
 * Search the verified catalog. Every filter is applied in SQL — the agent
 * (and the REST API) only ever sees products that actually exist and
 * actually match the requested constraints; nothing here is inferred or
 * relaxed silently.
 */
export async function searchProducts(query: SearchProductsQuery): Promise<ProductSearchResult> {
  const { category, brand, q, minPrice, maxPrice, inStockOnly, limit, offset } = query;

  // Built as a plain object rather than annotated with `Prisma.ProductWhereInput`
  // — TypeScript still checks it contextually against the real generated
  // type when it's passed into `findMany`/`count` below.
  const where = {
    isActive: true,
    ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
    ...(brand ? { brand: { equals: brand, mode: "insensitive" as const } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(inStockOnly ? { inventory: { quantity: { gt: 0 } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { inventory: true },
      orderBy: { price: "asc" },
      take: limit,
      skip: offset,
    }),
  ]);

  const offersByProduct = await getActiveOffersForProducts(products.map((p: ProductRow) => p.id));

  return {
    products: products.map((p: ProductRow) => toProductDTO(p, offersByProduct.get(p.id) ?? [])),
    total,
    limit,
    offset,
  };
}

/**
 * Full verified detail for one product. Returns null-safe fields only —
 * never backfills a missing attribute, and treats deactivated products
 * (isActive: false) as not found via the public API, same as search does.
 */
export async function getProductById(id: string): Promise<ProductDTO> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true },
  });

  if (!product || !product.isActive) {
    throw new AppError(404, `Product ${id} not found`, "PRODUCT_NOT_FOUND");
  }

  const offers = await getActiveOffersForProducts([product.id]);

  return toProductDTO(product, offers.get(product.id) ?? []);
}

/**
 * Distinct category list, used for building search filters in the UI.
 * Derived live from the catalog rather than hardcoded, so it can never
 * drift from what's actually in the database.
 */
export async function listCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r: { category: string }) => r.category);
}
