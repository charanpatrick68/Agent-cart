import { searchProductsQuerySchema } from "@/validators/product.validators";
import { searchProducts as searchProductsService } from "@/services/catalogService";

export async function searchProductsTool(rawInput: unknown) {
  // Reuse the exact same validator the REST API uses, so the agent can
  // never pass a filter shape the rest of the system doesn't understand.
  const parsed = searchProductsQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const result = await searchProductsService(parsed.data);
  // Trim to what the model actually needs — keeps tool-result tokens down
  // and avoids handing the model fields it has no reason to reference.
  return {
    total: result.total,
    products: result.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      description: p.description,
      attributes: p.attributes,
      inStock: p.inventory.inStock,
      quantity: p.inventory.quantity,
      offers: p.offers,
    })),
  };
}
