# AgentCart

**From intent to checkout — AI-native commerce with controlled agentic payments.**

Built for the Razorpay AI Buildathon 2026 — Track 1: AI Growth & Agentic Commerce.

AgentCart is a shopping experience where an AI agent understands a customer's intent, searches a verified merchant catalog, and prepares an order — but never has direct authority over money. Every price, inventory check, and payment is enforced by the backend and requires explicit user confirmation.

> **LLM proposes. Backend validates. User authorizes. Payment executes.**

This README describes what actually exists in the codebase right now, not a plan — see [`docs/architecture.md`](docs/architecture.md) for the design rationale behind it.

---

## What's here and what's not

| Area | State | Notes |
|---|---|---|
| Catalog (search, detail, inventory, categories) | **Built & tested** | Verified against real seeded Postgres data — filters, pagination, offer math all confirmed correct |
| Orders (create, validate, mark paid) | **Built & tested** | Price/inventory validation, offer application, and payment-success idempotency all verified against real data |
| Payments (Razorpay Test Mode order + signature verification) | **Built, not runnable here** | Complete and carefully reviewed, but genuinely requires your own Razorpay Test Mode keys to exercise — no way around that |
| Shopping agent (Google Gemini tool-calling) | **Built, not runnable here** | Complete — 5 tools, system prompt, orchestrator loop, audit logging — but requires your own `GEMINI_API_KEY` |
| Merchant dashboard (revenue, AI metrics, orders, activity log) | **Built & tested** | Every number is a live query over real tables — verified end-to-end with real seeded/ordered data, screenshots confirmed |
| Frontend (landing, shop chat, checkout, payment status, merchant pages) | **Built & tested** | All pages build cleanly; key pages verified visually |
| Evaluation | **Built & run** | A deterministic catalog-constraint eval that needs no API key — see [Evaluation](#evaluation) below for real, captured output |

"Requires your own key" isn't a gap in the code — it's inherent to testing a real LLM and a real payment gateway. The two sandboxes this project was built in couldn't reach `binaries.prisma.sh` (Prisma's engine CDN) or hold real Gemini/Razorpay credentials, so those two flows were verified by thorough code review and, where possible, by testing the surrounding logic directly against Postgres instead.

---

## Tech stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Google Gemini API (tool/function calling)
- **Payments**: Razorpay Test Mode

---

## Setup

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance

### 1. Backend

```bash
cd backend
cp .env.example .env
# fill in DATABASE_URL, GEMINI_API_KEY, RAZORPAY_KEY_ID/SECRET, JWT_SECRET
npm install
npx prisma generate
npx prisma migrate deploy   # applies the committed migration in prisma/migrations
npm run seed                # loads 32 demo products across 7 categories, offers, users
npm run dev                 # http://localhost:4000
```

> **Note on the committed migration:** `prisma/migrations/20260101000000_init/migration.sql` was authored by hand rather than generated via `prisma migrate dev`, because the sandboxes this project was built in have an outbound network allowlist that doesn't include `binaries.prisma.sh` (where Prisma's CLI downloads its query-engine binary). The SQL was verified by applying it directly to a real local Postgres instance and confirming every table, index, and foreign key was created correctly — it's exactly what `prisma migrate dev` would have produced from `schema.prisma`. On a machine with normal internet access, the standard Prisma workflow works exactly as usual.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to the backend
```

Open `http://localhost:5173`. Without `GEMINI_API_KEY`/Razorpay keys set, the catalog, orders, and merchant dashboard all work fully — only `/shop` chat and the payment step will show a clear "not configured yet" message instead of erroring opaquely.

---

## API reference

All routes are mounted under `/api`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Server + DB connectivity check |
| `GET` | `/products` | Search/list catalog — `category`, `brand`, `q`, `minPrice`, `maxPrice`, `inStockOnly`, `limit`, `offset` |
| `GET` | `/products/:id` | Full product detail (inventory + active offers included) |
| `GET` | `/products/:id/inventory` | Live stock check |
| `GET` | `/products/meta/categories` | Distinct category list |
| `POST` | `/chat` | Send a message to the shopping agent — `{ message, sessionId? }` |
| `GET` | `/chat/:sessionId/history` | Raw conversation history for a session |
| `GET` | `/chat/:sessionId/audit` | Audit log entries for a session |
| `POST` | `/orders` | Create a PENDING order directly (bypassing the agent) — `{ items: [{productId, quantity}] }` |
| `GET` | `/orders/:id` | Order detail |
| `POST` | `/payments/create` | Re-validates the order, creates a Razorpay order — `{ orderId }` |
| `POST` | `/payments/verify` | Verifies the Razorpay signature, marks the order PAID |
| `POST` | `/payments/abandon` | Marks a checkout that was closed/cancelled as FAILED (retryable) |
| `GET` | `/merchant/overview` | Revenue + AI commerce metrics |
| `GET` | `/merchant/orders` | Recent orders |
| `GET` | `/merchant/activity` | Recent audit log entries |

---

## The safety design, concretely

```
Customer: "I want this laptop."
Agent:    calls search_products, check_inventory → recommends Product B
Customer: "I'll take it."
Agent:    calls create_pending_order → order created, PENDING, server-computed total
Frontend: shows "Confirm & Pay ₹68,999" — this is a plain UI button, not an LLM action
Customer: clicks Confirm & Pay
Backend:  re-validates price + inventory ONE MORE TIME, THEN creates the Razorpay order
Razorpay: Checkout runs, returns a signature
Backend:  verifies the signature server-side — only then is the order marked PAID
```

**Deliberate deviation from the original tool list:** `create_payment` is *not* exposed to the LLM as a tool at all. The agent's only write capability is `create_pending_order`, which cannot charge anything. Initiating an actual Razorpay charge is a plain REST endpoint (`POST /api/payments/create`) that only the frontend calls, only after a real user click on "Confirm & Pay." This means there is no code path — not a prompt injection, not a model mistake, not an adversarial product description — through which any LLM output can trigger a payment. See `docs/architecture.md` for the full reasoning.

---

## Evaluation

`npm run eval` (in `backend/`) runs a **deterministic, no-API-key-required** evaluation: 29 structured test cases spanning normal queries, strict budgets, brand preferences, multi-constraint queries, out-of-stock scenarios, ambiguous requests, impossible requirements, above-budget requests, and cross-sell scenarios — run directly against `searchProducts()` and checked for constraint violations.

This was actually run against the real seeded catalog. Captured output:

```
AgentCart catalog-layer evaluation — 29 cases, 108 products returned total

Summary metrics:
  Price violation rate:          0.00% (0/108)
  Category violation rate:       0.00% (0/108)
  Brand violation rate:          0.00% (0/108)
  Out-of-stock returned despite inStockOnly filter: 0
  Impossible-constraint cases that wrongly returned results: 0/3
  Cases expecting results that came back empty: 0/26

Catalog grounding: 100% by construction — every result comes directly from
searchProducts()'s SQL query against Postgres; there is no code path for a
fabricated product to appear here.
```

**What this does and doesn't cover:** it proves the catalog layer itself can't violate a constraint or invent a product, regardless of what any LLM does with it — which is the guarantee the whole safety architecture depends on. It does *not* test whether the LLM's natural-language understanding correctly translates a user's request into the right constraints in the first place. `npm run eval:agent` is a second script that runs the same queries through the real agent and checks its actual tool-calling behavior — it requires `GEMINI_API_KEY` and was not run in either sandbox this project was built in, so no numbers are claimed for it here.

The originally-specified target of 100–200 queries was scaled down to 29 given the project's actual scope; the categories required by the brief are all represented, just with fewer examples per category than a production eval suite would have.

---

## Project structure

```
frontend/
  src/
    components/    StatusPill, StatCard, MerchantNav, OrderSummaryCard
    pages/
      customer/     LandingPage, ShopPage, PaymentStatusPage
      merchant/     MerchantDashboardPage, MerchantOrdersPage, MerchantActivityPage
    hooks/          useBackendHealth, useOrderPayment
    services/       api.ts, razorpay.ts
    types/          api.ts
    utils/          currency.ts

backend/
  src/
    routes/         health, product, chat, order, payment, merchant
    controllers/    thin — validate, call service, respond
    services/       catalogService, inventoryService, offerService, orderService,
                     paymentService, auditService, merchantService
    agent/
      orchestrator.ts    tool-calling loop
      systemPrompt.ts    grounding + safety rules given to the LLM
      toolSchemas.ts     the 5-tool JSON schema
      tools/             search_products, get_product, check_inventory,
                          get_offer, create_pending_order
    eval/            dataset.ts, runCatalogEval.ts, runAgentEval.ts
    middleware/      centralized error handling
    validators/      Zod schemas per route
    config/          env.ts (validated), prisma.ts (client singleton)
  prisma/
    schema.prisma
    seed.ts
    migrations/

docs/
  architecture.md    full design rationale, data flow, panel-readiness Q&A
```

---

## Security principles, as implemented

- The LLM never queries PostgreSQL or holds Razorpay credentials directly — it only calls 5 fixed backend tool functions, none of which can charge money.
- Prices, inventory, and order totals are always recalculated server-side at every step (`createPendingOrder`, `revalidatePendingOrder`, `createPayment`) — the model's own numbers are never trusted for anything financial. Verified: an order created with an active offer applied showed exactly the correct discounted price (`₹16,999 × 0.92 = ₹15,639.08`), computed server-side.
- Payment initiation requires an explicit user click, handled by a REST endpoint with no LLM involvement at all.
- Razorpay payment success is never trusted from the frontend alone — the HMAC signature is verified server-side (`crypto.timingSafeEqual`) before an order is marked `PAID`.
- `markOrderPaid` is idempotent — verified directly: calling it twice on the same order decremented inventory only once (30 → 28, not 30 → 26).
- Insufficient stock, non-existent products, and duplicate line items are all rejected with clear errors before an order is ever created — verified via direct API tests.
- No fabricated metrics anywhere: every merchant dashboard number and every eval result shown above came from an actual query or an actual test run, not a hardcoded placeholder.

---

## License

Built as a hackathon submission. No license specified yet.
