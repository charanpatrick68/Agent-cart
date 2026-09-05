/**
 * Agent-layer evaluation.
 *
 * Unlike runCatalogEval.ts, this actually drives the LLM through
 * runAgentTurn() for each dataset query and inspects the audit trail it
 * leaves behind (every search_products call it made, and what it
 * returned) to check the model's real behavior — not just the catalog's.
 *
 * Requires OPENAI_API_KEY to be set. This was NOT run in the sandbox
 * this project was built in (no API key available there) — run it
 * yourself with `npm run eval:agent` once you've set your key.
 */
import { evalDataset } from "@/eval/dataset";
import { runAgentTurn } from "@/agent/orchestrator";
import { prisma } from "@/config/prisma";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set — this eval requires a real agent to grade.");
    process.exit(1);
  }

  let toolCallCount = 0;
  let toolCallSuccessCount = 0;
  let casesWithGroundedReply = 0;
  let casesWithSearchCall = 0;

  for (const testCase of evalDataset) {
    const result = await runAgentTurn(testCase.naturalLanguage);
    const logs = await prisma.auditLog.findMany({ where: { sessionId: result.sessionId } });

    const searchCalls = logs.filter((l: any) => l.action === "search_products");
    if (searchCalls.length > 0) casesWithSearchCall++;

    toolCallCount += logs.length;
    toolCallSuccessCount += logs.filter((l: any) => l.success).length;

    // Cheap grounding proxy: if the reply mentions a price-like number,
    // at least one search/get_product call should have happened this
    // turn to have sourced it from.
    const mentionsPrice = /₹[\d,]+/.test(result.reply);
    if (!mentionsPrice || searchCalls.length > 0 || logs.some((l: any) => l.action === "get_product")) {
      casesWithGroundedReply++;
    }

    console.log(`[${testCase.id}] "${testCase.naturalLanguage}"`);
    console.log(`   tool calls: ${logs.map((l: any) => l.action).join(", ") || "(none)"}`);
    console.log(`   reply: ${result.reply.slice(0, 160)}${result.reply.length > 160 ? "…" : ""}\n`);
  }

  console.log("Summary:");
  console.log(`  Cases run: ${evalDataset.length}`);
  console.log(`  Cases that triggered a search_products call: ${casesWithSearchCall}/${evalDataset.length}`);
  console.log(`  Tool call success rate: ${((toolCallSuccessCount / Math.max(toolCallCount, 1)) * 100).toFixed(1)}%`);
  console.log(`  Replies with a plausible grounding source: ${casesWithGroundedReply}/${evalDataset.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Agent eval run failed:", err);
  process.exit(1);
});
