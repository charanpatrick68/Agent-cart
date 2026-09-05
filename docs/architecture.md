# AgentCart — Architecture

## 1. Why this needs an agent, not a chatbot

A recommendation chatbot answers questions about a catalog. An **agentic**
system takes bounded actions on the user's behalf — it searches, checks
inventory, prepares an order, and initiates a payment — while a deterministic
backend keeps every action inside hard limits it defines, not limits the
model agrees to follow. The distinguishing feature isn't that it uses an
LLM; it's that the LLM's output is *never itself* the source of truth for
anything that touches money.

## 2. High-level data flow

```
Customer
  │
  ▼
React Frontend (Vite + TS + Tailwind)
  │  REST/JSON over HTTPS
  ▼
Express API (Node + TS)
  │
  ├──► AI Agent Orchestrator (src/agent/orchestrator.ts)
  │       - builds the system prompt + JSON tool schema
  │       - calls the Gemini API with tool-calling enabled
  │       - dispatches each requested tool call to a fixed handler
  │       - logs every tool call + result to AuditLog before returning
  │       - the LLM's raw text/tool-call output is NEVER written to the
  │         database or trusted as a price/inventory/order value
  │
  ├──► Catalog Service    ──► Prisma ──► PostgreSQL
  ├──► Inventory Service  ──► Prisma ──► PostgreSQL
  ├──► Order Service      ──► Prisma ──► PostgreSQL
  └──► Audit Service      ──► Prisma ──► PostgreSQL

Separately, outside the agent entirely:
  Frontend "Confirm & Pay" click
  ──► POST /api/payments/create  ──► Order Service (re-validate) ──► Razorpay SDK (Test Mode)
  ──► POST /api/payments/verify  ──► signature check ──► Order Service (mark PAID)
```

Key structural rule: every agent **tool** (`src/agent/tools/*.ts`) is a thin
wrapper that calls the *same* service layer used by ordinary REST routes.
There is no code path from the LLM to Prisma or to Razorpay credentials —
only through these tool wrappers, which re-validate everything relevant
server-side regardless of what the model requested.

## 3. The core safety principle

> **LLM proposes → Backend validates → User authorizes → Payment executes**

Concretely, for a purchase:

1. The agent calls `create_pending_order`. The backend looks up the *current*
   product price and inventory from PostgreSQL — never from anything the
   model said — and computes the total itself.
2. The frontend shows that server-computed total to the user and asks for
   explicit confirmation ("Confirm & Pay").
3. Only after that confirmation does the frontend call the payment
   verification flow, which re-validates the order status, price, and
   inventory *again* before creating a Razorpay order.
4. Razorpay Checkout runs. The result is POSTed back to the backend, which
   verifies the Razorpay signature server-side before ever marking the
   order `PAID`. Frontend-reported "success" is never trusted on its own.

## 4. Database schema

See `backend/prisma/schema.prisma` for the authoritative definition. Summary:

- **User** — demo customers.
- **Product / Inventory / Offer** — the verified catalog. `Product.price` is
  in paise and is the only price the backend will ever charge against.
- **AgentSession / AgentMessage** — conversation history per shopping session.
- **AuditLog** — one row per meaningful agent action (tool call), recording
  input, output, a short reasoning string, and success/failure. This is the
  audit trail surfaced in the merchant dashboard.
- **Order / OrderItem** — orders move through
  `PENDING → PAYMENT_PENDING → PAID | FAILED | CANCELLED`. `OrderItem`
  snapshots the unit price at order-creation time so historical orders stay
  accurate even if a product's price changes later.

## 5. Agent tool contract

The agent has exactly **5 tools** — all read operations except one safe write. Notably, **`create_payment` is not one of them**; see the callout below.

| Tool | Effect | Backend guarantees |
|---|---|---|
| `search_products` | read | Only returns products that exist in the DB; filters (category, price range, brand, attributes) are applied in SQL, not by the model. |
| `get_product` | read | Full verified record; never backfills missing fields. |
| `check_inventory` | read | Authoritative current quantity. |
| `get_offer` | read | Only currently-active, non-expired offers. |
| `create_pending_order` | write (safe) | Recomputes price/total server-side regardless of what the model passed; validates stock and applies any active offers; does **not** touch Razorpay and cannot charge anything. |

### Why `create_payment` is deliberately NOT an agent tool

The original brief listed `create_payment` as a sixth, heavily-restricted agent tool. This implementation goes a step further: **payment initiation isn't reachable from the LLM at all.** `POST /api/payments/create` is a plain REST endpoint that only the frontend calls, and only in response to a real user click on "Confirm & Pay" — a discrete UI action, not something achievable through any chat message.

This closes an entire category of risk. Even in the "restricted tool" design, there's still a path — however narrow — from model output to a Razorpay call: the model decides *when* to invoke the tool, even if the backend then re-validates before executing. Removing the tool entirely removes that path structurally: no prompt injection, adversarial product description, or model mistake can *initiate* a payment, because there is no tool call that does so. The backend's re-validation (price, stock, order status) still happens either way — this change is about who can *trigger* that validated flow, not about weakening the validation itself.

Payment **confirmation** (Razorpay signature verification, `POST /api/payments/verify`) is likewise a plain REST endpoint, for the same reason — its correctness must never depend on any LLM output.

## 6. Prompt injection resistance

Product descriptions and any other merchant- or user-supplied text are
treated as untrusted data passed *to* the model, never as instructions from
the model's operator. The system prompt is fixed per request; nothing in
tool results can alter the tool schema, the set of callable tools, or the
requirement for user confirmation before payment.

## 7. What could go wrong, and how it's handled

| Failure mode | Handling |
|---|---|
| Model hallucinates a product or price | Every product fact shown to the user comes from a tool result, not free-form model text; the recommendation-generation step is instructed to only reference fields present in tool output. |
| Model tries to trigger a payment via chat | Not possible structurally — there is no payment tool in the model's tool set at all. `POST /api/payments/create` is a REST endpoint the model cannot call; only the frontend calls it, only after a real button click. |
| Razorpay payment fails or times out | Order stays `PAYMENT_PENDING`/reverts to a retryable state; nothing is marked `PAID` without a verified signature; no duplicate order or charge is created (idempotency key on the order). |
| Frontend reports payment success incorrectly (bug or tampering) | Irrelevant — the backend only trusts its own server-side Razorpay signature verification. |
| Merchant metrics get out of sync or fabricated | Dashboard metrics are computed as live queries over `Order`/`AuditLog`/etc. at read time, not maintained as a separate, driftable table. |

## 8. Scaling notes (for panel Q&A)

- API layer is stateless — horizontally scalable behind a load balancer.
- Heavy LLM calls could move to a queue if concurrency grows, decoupling
  the request/response cycle from model latency.
- Idempotency keys on order/payment creation prevent duplicate charges even
  under retries or concurrent requests.
- Read-heavy catalog queries are a natural fit for caching (e.g. Redis) once
  the catalog is large enough to matter — not needed at hackathon scale.
- Database consistency for order totals relies on recomputing from current
  `Product`/`Inventory` state inside a transaction at order-creation time.

## 9. Known environment note (development only)

This project was originally scaffolded in a sandboxed environment whose
outbound network was limited to an allowlist that did not include
`binaries.prisma.sh`. Because of that, `prisma/migrations/20260101000000_init/migration.sql`
was authored by hand instead of generated via `prisma migrate dev`, and was
verified by applying it directly to a real PostgreSQL instance. On any
machine with normal internet access, the standard Prisma workflow
(`prisma generate`, `prisma migrate dev`/`deploy`) works as usual — this note
exists purely for transparency about how the initial migration was produced.
