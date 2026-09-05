import { z } from "zod";

// z.coerce.boolean() has a well-known footgun: Boolean("false") === true,
// so the string "false" in a query param would incorrectly coerce to true.
// This preprocessor treats only "true"/"1" as true and everything else
// (including "false"/"0"/absent) as false.
const queryBoolean = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val === "true" || val === "1";
  return false;
}, z.boolean());

// GET /api/products?category=laptops&maxPrice=7000000&brand=Vulcan&q=programming
// Prices arrive from the client in paise (matching how they're stored), so
// there's no unit-conversion ambiguity between the frontend, the agent
// tools, and the database.
export const searchProductsQuerySchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).max(200).optional(), // free-text search over name/description
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    inStockOnly: queryBoolean.optional().default(false),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
    message: "minPrice must not be greater than maxPrice",
    path: ["minPrice"],
  });

export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;

export const productIdParamSchema = z.object({
  id: z.string().trim().min(1, "product id is required"),
});

