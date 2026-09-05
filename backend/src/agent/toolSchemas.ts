import type { FunctionDeclaration } from "@google/genai";

// This is the *entire* surface area the LLM can act through — there is no
// tool here that can charge a payment, change a price, or write directly
// to any table other than a PENDING order. `parametersJsonSchema` is plain
// JSON Schema, same shape used for the REST validators elsewhere.
export const toolSchemas: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "Search the verified merchant catalog. Only returns products that actually exist and match the given filters — never invent a product outside these results.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "e.g. laptops, smartphones, headphones, monitors, keyboards, mice, accessories" },
        brand: { type: "string" },
        q: { type: "string", description: "free-text search over product name/description" },
        minPrice: { type: "integer", description: "minimum price in paise (₹1 = 100 paise)" },
        maxPrice: { type: "integer", description: "maximum price in paise (₹1 = 100 paise)" },
        inStockOnly: { type: "boolean", description: "if true, exclude out-of-stock products" },
        limit: { type: "integer", description: "max results, default 20, max 50" },
      },
    },
  },
  {
    name: "get_product",
    description: "Get full verified details for one product by id, including live inventory and any active offers.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
      },
      required: ["productId"],
    },
  },
  {
    name: "check_inventory",
    description:
      "Check current stock for a product. Never assume a product is in stock without calling this — inventory changes independently of the catalog listing.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
      },
      required: ["productId"],
    },
  },
  {
    name: "get_offer",
    description: "Get merchant-approved active offers for a product. Never state a discount that isn't returned here.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
      },
      required: ["productId"],
    },
  },
  {
    name: "create_pending_order",
    description:
      "Prepare an order for the user to review. This does NOT charge the user and does NOT require the items to already be confirmed — it creates a PENDING order with a server-calculated total that the user will see and must explicitly confirm in the UI before any payment happens. Only call this once the user has agreed on specific product(s) and quantities.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
            },
            required: ["productId", "quantity"],
          },
        },
      },
      required: ["items"],
    },
  },
];
