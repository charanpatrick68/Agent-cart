import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiRequestError } from "@/services/api";
import { OrderSummaryCard } from "@/components/OrderSummaryCard";
import type { ChatResponse } from "@/types/api";

type ChatEntry =
  | { kind: "text"; role: "user" | "assistant"; text: string }
  | { kind: "order"; orderId: string }
  | { kind: "error"; text: string };

const SUGGESTIONS = [
  "I'm a CS student looking for a laptop under ₹70,000 for programming and occasional gaming.",
  "Show me wireless headphones with noise cancellation under ₹8,000.",
  "What monitors do you have for around ₹17,000?",
];

export function ShopPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(message: string) {
    if (!message.trim() || sending) return;
    setInput("");
    setEntries((prev) => [...prev, { kind: "text", role: "user", text: message }]);
    setSending(true);

    try {
      const res = await api.post<ChatResponse>("/api/chat", { message, sessionId });
      setSessionId(res.sessionId);
      setEntries((prev) => {
        const next: ChatEntry[] = [...prev, { kind: "text", role: "assistant", text: res.reply }];
        if (res.pendingOrder) next.push({ kind: "order", orderId: res.pendingOrder.orderId });
        return next;
      });
    } catch (err) {
      // The backend now sends a specific message for every failure case
      // (not configured, invalid key, out of credits, bad model name,
      // validation error, etc.) — just show it directly rather than
      // overriding it, so the real reason is always visible here.
      const message = err instanceof ApiRequestError ? err.message : "Something went wrong reaching the agent.";
      setEntries((prev) => [...prev, { kind: "error", text: message }]);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg text-ink">
            AgentCart
          </Link>
          <Link to="/merchant" className="text-sm text-ink-muted hover:text-ink">
            Merchant view
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        {entries.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-display text-2xl text-ink">What are you shopping for?</p>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Tell the agent your budget and what you need it for — it searches the real catalog
              and only recommends what's actually in stock.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-line px-4 py-2 text-left text-sm text-ink-muted hover:border-ink/40 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4">
          {entries.map((entry, i) => {
            if (entry.kind === "text") {
              return (
                <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${
                      entry.role === "user" ? "bg-accent text-accent-ink" : "bg-paper-raised border border-line text-ink"
                    }`}
                  >
                    {entry.text}
                  </div>
                </div>
              );
            }
            if (entry.kind === "order") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="w-full max-w-[85%]">
                    <OrderSummaryCard orderId={entry.orderId} />
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-sm text-danger">
                  {entry.text}
                </div>
              </div>
            );
          })}
          {sending && <p className="text-sm text-ink-muted">Thinking…</p>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-0 mt-6 flex gap-2 border-t border-line bg-paper pt-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about laptops, headphones, monitors…"
            className="flex-1 rounded-md border border-line bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}