import { Link } from "react-router-dom";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { StatusPill } from "@/components/StatusPill";

const flowSteps = [
  {
    label: "LLM proposes",
    detail: "The agent reasons over verified catalog data and suggests a product or order.",
  },
  {
    label: "Backend validates",
    detail: "Price, inventory, and totals are recalculated server-side — the model's numbers are never trusted.",
  },
  {
    label: "User authorizes",
    detail: "The customer sees the final amount and must explicitly confirm before anything is charged.",
  },
  {
    label: "Payment executes",
    detail: "Razorpay Test Mode runs the charge; the signature is verified server-side before an order is marked paid.",
  },
];

const traceLines = [
  { t: "10:32:01", line: "user: laptop under ₹70,000 for programming + gaming" },
  { t: "10:32:02", line: "search_products(category: laptops, maxPrice: 7000000)" },
  { t: "10:32:03", line: "→ 4 products returned" },
  { t: "10:32:05", line: "check_inventory(CodeForge R5)" },
  { t: "10:32:06", line: "→ in stock, qty 9" },
  { t: "10:32:07", line: "recommendation generated, grounded in 2 candidates" },
];

function ConnectivityBadge() {
  const { state } = useBackendHealth();

  if (state === "checking") return <StatusPill tone="neutral">checking backend…</StatusPill>;
  if (state === "connected") return <StatusPill tone="success">backend + database connected</StatusPill>;
  return <StatusPill tone="danger">backend unreachable</StatusPill>;
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg">AgentCart</span>
          <nav className="flex items-center gap-6 text-sm text-ink-muted">
            <Link to="/shop" className="hover:text-ink">
              Shop
            </Link>
            <Link to="/merchant" className="hover:text-ink">
              Merchant
            </Link>
            <ConnectivityBadge />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">
              Razorpay AI Buildathon 2026 — Track 1
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
              From intent to checkout — AI-native commerce with controlled agentic payments.
            </h1>
            <p className="mt-6 max-w-lg text-ink-muted">
              AgentCart lets a shopping agent understand what a customer needs, search a verified
              catalog, and prepare an order — but it never touches money directly. Every price,
              stock check, and payment is enforced by the backend, not the model.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/shop"
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90"
              >
                Try the shopping agent
              </Link>
              <Link
                to="/merchant"
                className="rounded-md border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-ink/40"
              >
                View merchant dashboard
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-line bg-paper-raised">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="font-mono text-xs text-ink-muted">agent audit trail</span>
                <StatusPill tone="success">live</StatusPill>
              </div>
              <div className="space-y-2 px-4 py-4 font-mono text-xs">
                {traceLines.map((row) => (
                  <div key={row.t} className="flex gap-3">
                    <span className="shrink-0 text-ink-muted/70">{row.t}</span>
                    <span className="text-ink">{row.line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-24">
          <h2 className="font-display text-2xl text-ink">The core safety principle</h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            The agent can reason and recommend freely. It cannot move money on its own — every
            step below is enforced in order, every time.
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
            {flowSteps.map((step, i) => (
              <li key={step.label} className="bg-paper-raised p-5">
                <span className="font-mono text-xs text-ink-muted">0{i + 1}</span>
                <p className="mt-2 font-medium text-ink">{step.label}</p>
                <p className="mt-1 text-sm text-ink-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
