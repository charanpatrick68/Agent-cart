// Structured evaluation queries. Each case expresses what a shopper might
// ask as concrete catalog constraints (category/budget/brand/stock), so the
// catalog-layer eval (runCatalogEval.ts) can check constraint satisfaction
// deterministically — no LLM call required, so this always runs and its
// numbers are never fabricated.
//
// `naturalLanguage` is kept alongside each case so the same dataset can
// also drive the optional agent-layer eval (runAgentEval.ts), which DOES
// require OPENAI_API_KEY and checks whether the model's actual behavior
// respects these same constraints.

export type EvalCase = {
  id: string;
  category:
    | "normal"
    | "strict_budget"
    | "brand_preference"
    | "multi_constraint"
    | "out_of_stock"
    | "ambiguous"
    | "impossible"
    | "above_budget"
    | "cross_sell";
  naturalLanguage: string;
  constraints: {
    category?: string;
    brand?: string;
    maxPrice?: number; // paise
    minPrice?: number;
    inStockOnly?: boolean;
  };
  // What a correct response should NOT be able to do, used by the eval:
  expectNonEmptyResult?: boolean; // false for "impossible" cases
};

export const evalDataset: EvalCase[] = [
  // --- normal queries ---
  { id: "n1", category: "normal", naturalLanguage: "Show me laptops for programming.", constraints: { category: "laptops" }, expectNonEmptyResult: true },
  { id: "n2", category: "normal", naturalLanguage: "I need a wireless mouse.", constraints: { category: "mice" }, expectNonEmptyResult: true },
  { id: "n3", category: "normal", naturalLanguage: "What monitors do you have?", constraints: { category: "monitors" }, expectNonEmptyResult: true },
  { id: "n4", category: "normal", naturalLanguage: "Looking for a smartphone.", constraints: { category: "smartphones" }, expectNonEmptyResult: true },
  { id: "n5", category: "normal", naturalLanguage: "Do you sell keyboards?", constraints: { category: "keyboards" }, expectNonEmptyResult: true },

  // --- strict budget ---
  { id: "b1", category: "strict_budget", naturalLanguage: "Laptop under ₹35,000.", constraints: { category: "laptops", maxPrice: 3500000 }, expectNonEmptyResult: true },
  { id: "b2", category: "strict_budget", naturalLanguage: "Headphones under ₹1,500.", constraints: { category: "headphones", maxPrice: 150000 }, expectNonEmptyResult: true },
  { id: "b3", category: "strict_budget", naturalLanguage: "Monitor under ₹7,000.", constraints: { category: "monitors", maxPrice: 700000 }, expectNonEmptyResult: true },
  { id: "b4", category: "strict_budget", naturalLanguage: "Smartphone under ₹13,000.", constraints: { category: "smartphones", maxPrice: 1300000 }, expectNonEmptyResult: true },
  { id: "b5", category: "strict_budget", naturalLanguage: "Keyboard under ₹1,600.", constraints: { category: "keyboards", maxPrice: 160000 }, expectNonEmptyResult: true },

  // --- brand preference ---
  { id: "br1", category: "brand_preference", naturalLanguage: "I want a Vulcan laptop.", constraints: { category: "laptops", brand: "Vulcan" }, expectNonEmptyResult: true },
  { id: "br2", category: "brand_preference", naturalLanguage: "Show me ClearView monitors.", constraints: { category: "monitors", brand: "ClearView" }, expectNonEmptyResult: true },
  { id: "br3", category: "brand_preference", naturalLanguage: "Do you have Nova phones?", constraints: { category: "smartphones", brand: "Nova" }, expectNonEmptyResult: true },
  { id: "br4", category: "brand_preference", naturalLanguage: "PodBuds earphones please.", constraints: { category: "headphones", brand: "PodBuds" }, expectNonEmptyResult: true },

  // --- multiple constraints ---
  { id: "m1", category: "multi_constraint", naturalLanguage: "Vulcan laptop under ₹70,000.", constraints: { category: "laptops", brand: "Vulcan", maxPrice: 7000000 }, expectNonEmptyResult: true },
  { id: "m2", category: "multi_constraint", naturalLanguage: "In-stock ClearView monitor under ₹18,000.", constraints: { category: "monitors", brand: "ClearView", maxPrice: 1800000, inStockOnly: true }, expectNonEmptyResult: true },
  { id: "m3", category: "multi_constraint", naturalLanguage: "AeroTech laptop between ₹30,000 and ₹60,000.", constraints: { category: "laptops", brand: "AeroTech", minPrice: 3000000, maxPrice: 6000000 }, expectNonEmptyResult: true },
  { id: "m4", category: "multi_constraint", naturalLanguage: "In-stock headphones under ₹6,500.", constraints: { category: "headphones", maxPrice: 650000, inStockOnly: true }, expectNonEmptyResult: true },

  // --- out of stock (CodeForge R3 in seed data has 0 quantity) ---
  { id: "o1", category: "out_of_stock", naturalLanguage: "Do you have the CodeForge R3 in stock?", constraints: { category: "laptops", brand: "Vulcan", inStockOnly: true }, expectNonEmptyResult: true }, // in-stock filter should exclude it, other Vulcan laptops remain
  { id: "o2", category: "out_of_stock", naturalLanguage: "In-stock laptops only, please.", constraints: { category: "laptops", inStockOnly: true }, expectNonEmptyResult: true },

  // --- ambiguous (no strong constraint — should still return something reasonable) ---
  { id: "a1", category: "ambiguous", naturalLanguage: "I need something for work.", constraints: {}, expectNonEmptyResult: true },
  { id: "a2", category: "ambiguous", naturalLanguage: "What's good?", constraints: {}, expectNonEmptyResult: true },

  // --- impossible (should correctly return nothing) ---
  { id: "i1", category: "impossible", naturalLanguage: "Laptop under ₹500.", constraints: { category: "laptops", maxPrice: 50000 }, expectNonEmptyResult: false },
  { id: "i2", category: "impossible", naturalLanguage: "TitanBook under ₹1,000.", constraints: { category: "laptops", brand: "Titan", maxPrice: 100000 }, expectNonEmptyResult: false },
  { id: "i3", category: "impossible", naturalLanguage: "A monitor from a brand we don't carry, 'Nonexistex'.", constraints: { category: "monitors", brand: "Nonexistex" }, expectNonEmptyResult: false },

  // --- above typical budget (should surface premium options honestly) ---
  { id: "ab1", category: "above_budget", naturalLanguage: "Best gaming laptop, budget flexible.", constraints: { category: "laptops", brand: "Titan" }, expectNonEmptyResult: true },
  { id: "ab2", category: "above_budget", naturalLanguage: "Top-tier foldable phone.", constraints: { category: "smartphones", brand: "Zenith" }, expectNonEmptyResult: true },

  // --- cross-sell scenarios (paired product should exist in catalog) ---
  { id: "cs1", category: "cross_sell", naturalLanguage: "Buying a 15-inch laptop, what else might I need?", constraints: { category: "accessories" }, expectNonEmptyResult: true },
  { id: "cs2", category: "cross_sell", naturalLanguage: "Getting a monitor, any add-ons?", constraints: { category: "accessories" }, expectNonEmptyResult: true },
];
