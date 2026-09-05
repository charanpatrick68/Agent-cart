import { GoogleGenAI, Content, Part } from "@google/genai";
import { env } from "@/config/env";
import { prisma } from "@/config/prisma";
import { toolSchemas } from "@/agent/toolSchemas";
import { SYSTEM_PROMPT } from "@/agent/systemPrompt";
import { logAction } from "@/services/auditService";
import { searchProductsTool } from "@/agent/tools/searchProducts";
import { getProductTool } from "@/agent/tools/getProduct";
import { checkInventoryTool } from "@/agent/tools/checkInventory";
import { getOfferTool } from "@/agent/tools/getOffer";
import { createPendingOrderTool } from "@/agent/tools/createPendingOrder";
import { AppError } from "@/middleware/errorHandler";

let geminiClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, "The shopping agent is not configured on this server yet.", "AGENT_NOT_CONFIGURED");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// The fixed dispatch table — this IS the entire set of actions the model
// can take. There is no code path from the model to anything not listed
// here (no direct DB access, no payments).
type ToolContext = { sessionId: string };
const toolHandlers: Record<string, (input: any, ctx: ToolContext) => Promise<any>> = {
  search_products: (input) => searchProductsTool(input),
  get_product: (input) => getProductTool(input),
  check_inventory: (input) => checkInventoryTool(input),
  get_offer: (input) => getOfferTool(input),
  create_pending_order: (input, ctx) => createPendingOrderTool(input, ctx),
};

const MAX_TOOL_ROUNDS = 6; // guards against a runaway tool-call loop

export type AgentTurnResult = {
  sessionId: string;
  reply: string;
  pendingOrder: { orderId: string; total: number; itemCount: number } | null;
};

async function getOrCreateSession(sessionId?: string): Promise<string> {
  if (sessionId) {
    const existing = await prisma.agentSession.findUnique({ where: { id: sessionId } });
    if (existing) return existing.id;
  }
  const created = await prisma.agentSession.create({ data: {} });
  return created.id;
}

async function loadHistory(sessionId: string): Promise<Content[]> {
  const rows = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r: any) => ({ role: r.role, parts: r.content }));
}

async function persistMessage(sessionId: string, role: "user" | "model", parts: Part[]) {
  await prisma.agentMessage.create({
    data: { sessionId, role, content: parts as any },
  });
}

/**
 * Calls Gemini and turns common SDK errors into a clear, user-facing
 * AppError instead of letting them fall through as an opaque 500. This is
 * diagnostic, not a safety mechanism — it doesn't change what the model
 * can or can't do.
 */
async function callModel(client: GoogleGenAI, history: Content[]) {
  try {
    return await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: toolSchemas }],
      },
    });
  } catch (err: any) {
    // Always log the raw error server-side before attempting to classify
    // it — the classification below is a best-effort convenience, not a
    // substitute for the real message when it guesses wrong.
    console.error("Gemini API call failed:", err?.status, err?.message, err);

    const status = err?.status;
    const msg: string = err?.message ?? "";

    if (status === 401 || status === 403) {
      throw new AppError(503, "The shopping agent's API key is invalid. Check GEMINI_API_KEY.", "AGENT_AUTH_ERROR");
    }
    if (status === 429 || /quota|rate.?limit/i.test(msg)) {
      throw new AppError(
        503,
        "The shopping agent is temporarily unavailable — the Gemini API key has hit its rate limit or quota. Check aistudio.google.com.",
        "AGENT_QUOTA_EXCEEDED"
      );
    }
    if (status === 503 || /unavailable|high demand|overloaded/i.test(msg)) {
      throw new AppError(
        503,
        "Google's Gemini API is temporarily overloaded (high demand on their end) — this isn't a bug, just try again in a few seconds.",
        "AGENT_UPSTREAM_UNAVAILABLE"
      );
    }
    // Narrow, specific phrasing only — a bare mention of the word "model"
    // anywhere in an error message is not a reliable signal and previously
    // caused this to misfire on unrelated errors.
    if (status === 404 || /model (was )?not found|no such model|unknown model/i.test(msg)) {
      throw new AppError(
        503,
        `The shopping agent's configured model ("${env.GEMINI_MODEL}") isn't available for this API key. Try a different GEMINI_MODEL.`,
        "AGENT_MODEL_UNAVAILABLE"
      );
    }
    throw err;
  }
}

/**
 * Runs one full turn: adds the user's message, calls the model, executes
 * any requested tool calls (logging each one), and loops until the model
 * produces a final text reply. Every tool call this turn makes is written
 * to AuditLog before the loop continues — so even if the model or the
 * server crashes mid-turn, what already happened is recorded.
 */
export async function runAgentTurn(userMessage: string, sessionId?: string): Promise<AgentTurnResult> {
  const resolvedSessionId = await getOrCreateSession(sessionId);
  const client = getClient();

  await persistMessage(resolvedSessionId, "user", [{ text: userMessage }]);

  const history = await loadHistory(resolvedSessionId);
  let pendingOrder: AgentTurnResult["pendingOrder"] = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response;
    try {
      response = await callModel(client, history);
    } catch (err) {
      // If a tool call earlier in THIS turn already created a real
      // order (e.g. the model called create_pending_order, then the
      // follow-up call to summarize it failed), don't let that order
      // vanish behind a generic error — the order genuinely exists in
      // the database, so hand it back to the user along with a plain
      // explanation instead of losing it.
      if (pendingOrder) {
        return {
          sessionId: resolvedSessionId,
          reply:
            "I've prepared your order below — the agent hit a temporary issue summarizing it, but the order itself was created successfully. Review the details and confirm when ready.",
          pendingOrder,
        };
      }
      throw err;
    }

    const modelContent: Content = response.candidates?.[0]?.content ?? { role: "model", parts: [] };
    const modelParts: Part[] = modelContent.parts ?? [];

    // Persist the model's turn (text + any functionCall parts) exactly as
    // returned, so history replays correctly on the next request.
    await persistMessage(resolvedSessionId, "model", modelParts);
    history.push({ role: "model", parts: modelParts });

    const functionCalls = response.functionCalls ?? [];

    if (functionCalls.length === 0) {
      return {
        sessionId: resolvedSessionId,
        reply: response.text ?? "",
        pendingOrder,
      };
    }

    // Execute every function call the model asked for, in order, and
    // collect the results into a single functionResponse turn.
    const functionResponseParts: Part[] = [];

    for (const call of functionCalls) {
      const handler = toolHandlers[call.name ?? ""];
      let output: unknown;
      let success = true;

      if (!handler) {
        output = { error: `Unknown tool: ${call.name}` };
        success = false;
      } else {
        try {
          output = await handler(call.args, { sessionId: resolvedSessionId });
          success = !(output && typeof output === "object" && "error" in output);
        } catch (err) {
          output = { error: err instanceof Error ? err.message : "Tool execution failed" };
          success = false;
        }
      }

      await logAction({
        sessionId: resolvedSessionId,
        action: call.name ?? "unknown_tool",
        input: call.args,
        output,
        success,
      });

      if (call.name === "create_pending_order" && success && output && typeof output === "object") {
        const o = output as any;
        if (o.orderId) {
          pendingOrder = { orderId: o.orderId, total: o.total, itemCount: (o.items ?? []).length };
        }
      }

      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          id: call.id,
          response: (output && typeof output === "object" ? output : { result: output }) as Record<string, unknown>,
        },
      });
    }

    await persistMessage(resolvedSessionId, "user", functionResponseParts);
    history.push({ role: "user", parts: functionResponseParts });
  }

  // Hit the round cap without a final text answer — fail safely with a
  // clear message rather than looping forever or returning nothing.
  return {
    sessionId: resolvedSessionId,
    reply: "I'm having trouble completing that request right now. Could you rephrase or narrow it down?",
    pendingOrder,
  };
}
