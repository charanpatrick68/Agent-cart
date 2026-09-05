import OpenAI from "openai";

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

let groqClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.GROQ_API_KEY) {
    throw new AppError(
      503,
      "The shopping agent is not configured on this server yet.",
      "AGENT_NOT_CONFIGURED"
    );
  }

  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  return groqClient;
}

// The fixed dispatch table.
// The model can ONLY call these backend functions.
type ToolContext = {
  sessionId: string;
};

const toolHandlers: Record<
  string,
  (input: any, ctx: ToolContext) => Promise<any>
> = {
  search_products: (input) => searchProductsTool(input),
  get_product: (input) => getProductTool(input),
  check_inventory: (input) => checkInventoryTool(input),
  get_offer: (input) => getOfferTool(input),
  create_pending_order: (input, ctx) =>
    createPendingOrderTool(input, ctx),
};

const MAX_TOOL_ROUNDS = 6;

export type AgentTurnResult = {
  sessionId: string;
  reply: string;
  pendingOrder: {
    orderId: string;
    total: number;
    itemCount: number;
  } | null;
};

async function getOrCreateSession(
  sessionId?: string
): Promise<string> {
  if (sessionId) {
    const existing = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (existing) {
      return existing.id;
    }
  }

  const created = await prisma.agentSession.create({
    data: {},
  });

  return created.id;
}

/**
 * Convert the stored database messages into the input format
 * expected by the OpenAI-compatible Responses API used by Groq.
 *
 * We intentionally keep the stored content flexible because
 * previous versions of AgentCart stored different response parts.
 */
async function loadHistory(sessionId: string): Promise<any[]> {
  const rows = await prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const history: any[] = [];

  for (const row of rows) {
    const content: any = row.content;

    // Normal user/model message containing text.
    if (Array.isArray(content)) {
      for (const part of content) {
        if (!part || typeof part !== "object") {
          continue;
        }

        // Text part.
        if (typeof part.text === "string") {
          history.push({
            role: row.role,
            content: part.text,
          });
        }

        // Previous Responses API function call.
        if (
          part.type === "function_call" &&
          typeof part.call_id === "string"
        ) {
          history.push({
            type: "function_call",
            call_id: part.call_id,
            name: part.name,
            arguments: part.arguments,
          });
        }

        // Previous function-call output.
        if (
          part.type === "function_call_output" &&
          typeof part.call_id === "string"
        ) {
          history.push({
            type: "function_call_output",
            call_id: part.call_id,
            output:
              typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output ?? {}),
          });
        }
      }
    } else if (typeof content === "string") {
      history.push({
        role: row.role,
        content,
      });
    }
  }

  return history;
}

async function persistMessage(
  sessionId: string,
  role: "user" | "model",
  parts: any[]
) {
  await prisma.agentMessage.create({
    data: {
      sessionId,
      role,
      content: parts as any,
    },
  });
}

/**
 * Calls Groq through its OpenAI-compatible Responses API.
 */
async function callModel(
  client: OpenAI,
  history: any[]
): Promise<any> {
  try {
    return await client.responses.create({
      model: env.GROQ_MODEL,

      // Responses API requires input rather than contents.
      input: history,

      // System prompt becomes the Responses API instructions.
      instructions: SYSTEM_PROMPT,

      // AgentCart's existing tool schemas are compatible with
      // OpenAI-style function tools.
      tools: toolSchemas as any,
    });
  } catch (err: any) {
    console.error(
      "Groq API call failed:",
      err?.status,
      err?.message,
      err
    );

    const status = err?.status;
    const msg = err?.message ?? "";

    if (status === 401 || status === 403) {
      throw new AppError(
        503,
        "The shopping agent's Groq API key is invalid. Check GROQ_API_KEY.",
        "AGENT_AUTH_ERROR"
      );
    }

    if (
      status === 429 ||
      /quota|rate.?limit|too many requests/i.test(msg)
    ) {
      throw new AppError(
        503,
        "The shopping agent is temporarily unavailable because the Groq API rate limit was reached. Please try again shortly.",
        "AGENT_QUOTA_EXCEEDED"
      );
    }

    if (
      status === 503 ||
      /unavailable|overloaded|high demand/i.test(msg)
    ) {
      throw new AppError(
        503,
        "The Groq service is temporarily unavailable. Please try again in a few seconds.",
        "AGENT_UPSTREAM_UNAVAILABLE"
      );
    }

    if (
      status === 404 ||
      /model.*not found|no such model|unknown model/i.test(msg)
    ) {
      throw new AppError(
        503,
        `The configured Groq model ("${env.GROQ_MODEL}") is not available. Check GROQ_MODEL.`,
        "AGENT_MODEL_UNAVAILABLE"
      );
    }

    throw err;
  }
}

export async function runAgentTurn(
  userMessage: string,
  sessionId?: string
): Promise<AgentTurnResult> {
  const resolvedSessionId =
    await getOrCreateSession(sessionId);

  const client = getClient();

  // Store the user's message.
  await persistMessage(
    resolvedSessionId,
    "user",
    [{ text: userMessage }]
  );

  const history = await loadHistory(resolvedSessionId);

  // Make sure the current user message exists in the model input.
  //
  // This protects us from older database rows that may have been
  // stored in a different format.
  const lastHistoryItem =
    history[history.length - 1];

  if (
    !lastHistoryItem ||
    lastHistoryItem.role !== "user" ||
    lastHistoryItem.content !== userMessage
  ) {
    history.push({
      role: "user",
      content: userMessage,
    });
  }

  let pendingOrder:
    AgentTurnResult["pendingOrder"] = null;

  for (
    let round = 0;
    round < MAX_TOOL_ROUNDS;
    round++
  ) {
    let response: any;

    try {
      response = await callModel(client, history);
    } catch (err) {
      // If an order was already successfully created during
      // this turn, don't hide the order behind a later LLM error.
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

    /*
     * Responses API returns output items.
     *
     * We inspect them manually because the OpenAI SDK's union type
     * contains several possible ResponseOutputItem variants.
     */
    const outputItems: any[] =
      response?.output ?? [];

    // Save the model response in our existing session history.
    await persistMessage(
      resolvedSessionId,
      "model",
      outputItems
    );

    /*
     * Add the model output to the next request.
     *
     * Groq's Responses API supports passing previous output items
     * back as conversation input.
     */
    for (const item of outputItems) {
      history.push(item);
    }

    // Find function calls requested by the model.
    const functionCalls = outputItems.filter(
      (item) =>
        item &&
        item.type === "function_call"
    );

    // No tool call means the model has produced its final answer.
    if (functionCalls.length === 0) {
      const reply =
        typeof response?.output_text === "string"
          ? response.output_text
          : "";

      return {
        sessionId: resolvedSessionId,
        reply,
        pendingOrder,
      };
    }

    // Execute every requested tool.
    for (const call of functionCalls) {
      const toolName =
        typeof call.name === "string"
          ? call.name
          : "";

      const handler =
        toolHandlers[toolName];

      let parsedArgs: any = {};

      try {
        if (typeof call.arguments === "string") {
          parsedArgs =
            call.arguments.trim()
              ? JSON.parse(call.arguments)
              : {};
        } else if (
          call.arguments &&
          typeof call.arguments === "object"
        ) {
          parsedArgs = call.arguments;
        }
      } catch {
        parsedArgs = {};
      }

      let output: unknown;
      let success = true;

      if (!handler) {
        output = {
          error: `Unknown tool: ${toolName}`,
        };
        success = false;
      } else {
        try {
          output = await handler(
            parsedArgs,
            {
              sessionId: resolvedSessionId,
            }
          );

          success = !(
            output &&
            typeof output === "object" &&
            "error" in output
          );
        } catch (err) {
          output = {
            error:
              err instanceof Error
                ? err.message
                : "Tool execution failed",
          };

          success = false;
        }
      }

      // Always record the tool execution.
      await logAction({
        sessionId: resolvedSessionId,
        action: toolName || "unknown_tool",
        input: parsedArgs,
        output,
        success,
      });

      // Capture the created pending order.
      if (
        toolName === "create_pending_order" &&
        success &&
        output &&
        typeof output === "object"
      ) {
        const order = output as any;

        if (order.orderId) {
          pendingOrder = {
            orderId: order.orderId,
            total: order.total,
            itemCount:
              Array.isArray(order.items)
                ? order.items.length
                : 0,
          };
        }
      }

      /*
       * Responses API tool result.
       *
       * The call_id must exactly match the function call's call_id.
       */
      const functionOutput = {
        type: "function_call_output",
        call_id: call.call_id,
        output:
          typeof output === "string"
            ? output
            : JSON.stringify(
                output ?? {}
              ),
      };

      history.push(functionOutput);

      /*
       * Persist the tool result as a "user" message because
       * that's how the existing AgentCart database schema stores
       * tool-response turns.
       */
      await persistMessage(
        resolvedSessionId,
        "user",
        [functionOutput]
      );
    }
  }

  // Safety guard against an endless tool loop.
  return {
    sessionId: resolvedSessionId,
    reply:
      "I'm having trouble completing that request right now. Could you rephrase or narrow it down?",
    pendingOrder,
  };
}