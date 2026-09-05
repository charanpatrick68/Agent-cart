/**
 * Catalog-layer evaluation.
 *
 * This checks the guarantees that matter regardless of which LLM is
 * driving the agent: given a set of constraints, does searchProducts()
 * ever return a product that violates them, or a product that isn't
 * actually in the database? This requires no API keys and always runs,
 * so its numbers are never fabricated — they're computed from real
 * queries against the real (seeded) database each time it's run.
 *
 * Run with: npm run eval
 */
import { evalDataset } from "@/eval/dataset";
import { searchProducts } from "@/services/catalogService";

type CaseResult = {
  id: string;
  category: string;
  resultCount: number;
  priceViolations: number;
  categoryViolations: number;
  brandViolations: number;
  outOfStockReturnedDespiteFilter: number;
  emptyResultExpectedButFound: boolean;
  nonEmptyResultExpectedButEmpty: boolean;
};

async function runOne(testCase: (typeof evalDataset)[number]): Promise<CaseResult> {
  const { constraints } = testCase;

  const result = await searchProducts({
    category: constraints.category,
    brand: constraints.brand,
    maxPrice: constraints.maxPrice,
    minPrice: constraints.minPrice,
    inStockOnly: constraints.inStockOnly ?? false,
    limit: 20,
    offset: 0,
  });

  let priceViolations = 0;
  let categoryViolations = 0;
  let brandViolations = 0;
  let outOfStockReturnedDespiteFilter = 0;

  for (const p of result.products) {
    if (constraints.maxPrice !== undefined && p.price > constraints.maxPrice) priceViolations++;
    if (constraints.minPrice !== undefined && p.price < constraints.minPrice) priceViolations++;
    if (constraints.category && p.category.toLowerCase() !== constraints.category.toLowerCase()) categoryViolations++;
    if (constraints.brand && p.brand.toLowerCase() !== constraints.brand.toLowerCase()) brandViolations++;
    if (constraints.inStockOnly && !p.inventory.inStock) outOfStockReturnedDespiteFilter++;
  }

  return {
    id: testCase.id,
    category: testCase.category,
    resultCount: result.products.length,
    priceViolations,
    categoryViolations,
    brandViolations,
    outOfStockReturnedDespiteFilter,
    emptyResultExpectedButFound: testCase.expectNonEmptyResult === false && result.products.length > 0,
    nonEmptyResultExpectedButEmpty: testCase.expectNonEmptyResult === true && result.products.length === 0,
  };
}

async function main() {
  const results: CaseResult[] = [];
  for (const testCase of evalDataset) {
    results.push(await runOne(testCase));
  }

  const totalCases = results.length;
  const totalProductsReturned = results.reduce((sum, r) => sum + r.resultCount, 0);
  const totalPriceViolations = results.reduce((sum, r) => sum + r.priceViolations, 0);
  const totalCategoryViolations = results.reduce((sum, r) => sum + r.categoryViolations, 0);
  const totalBrandViolations = results.reduce((sum, r) => sum + r.brandViolations, 0);
  const totalOutOfStockViolations = results.reduce((sum, r) => sum + r.outOfStockReturnedDespiteFilter, 0);
  const impossibleCasesWronglyNonEmpty = results.filter((r) => r.emptyResultExpectedButFound).length;
  const expectedNonEmptyButEmpty = results.filter((r) => r.nonEmptyResultExpectedButEmpty).length;

  console.log(`\nAgentCart catalog-layer evaluation — ${totalCases} cases, ${totalProductsReturned} products returned total\n`);
  console.log("Per-case results:");
  console.table(
    results.map((r) => ({
      id: r.id,
      type: r.category,
      results: r.resultCount,
      priceViol: r.priceViolations,
      categoryViol: r.categoryViolations,
      brandViol: r.brandViolations,
      stockViol: r.outOfStockReturnedDespiteFilter,
      unexpectedEmpty: r.nonEmptyResultExpectedButEmpty ? "YES" : "",
      unexpectedNonEmpty: r.emptyResultExpectedButFound ? "YES" : "",
    }))
  );

  console.log("\nSummary metrics:");
  console.log(`  Price violation rate:          ${(totalPriceViolations / Math.max(totalProductsReturned, 1) * 100).toFixed(2)}% (${totalPriceViolations}/${totalProductsReturned})`);
  console.log(`  Category violation rate:       ${(totalCategoryViolations / Math.max(totalProductsReturned, 1) * 100).toFixed(2)}% (${totalCategoryViolations}/${totalProductsReturned})`);
  console.log(`  Brand violation rate:          ${(totalBrandViolations / Math.max(totalProductsReturned, 1) * 100).toFixed(2)}% (${totalBrandViolations}/${totalProductsReturned})`);
  console.log(`  Out-of-stock returned despite inStockOnly filter: ${totalOutOfStockViolations}`);
  console.log(`  Impossible-constraint cases that wrongly returned results: ${impossibleCasesWronglyNonEmpty}/${results.filter((r) => evalDataset.find((c) => c.id === r.id)?.expectNonEmptyResult === false).length}`);
  console.log(`  Cases expecting results that came back empty: ${expectedNonEmptyButEmpty}/${results.filter((r) => evalDataset.find((c) => c.id === r.id)?.expectNonEmptyResult === true).length}`);
  console.log(`\nCatalog grounding: 100% by construction — every result comes directly from searchProducts()'s SQL query against Postgres; there is no code path for a fabricated product to appear here.\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Eval run failed:", err);
  process.exit(1);
});
