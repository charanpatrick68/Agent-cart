# AgentCart

**From intent to checkout — an AI shopping assistant that can recommend and prepare an order, but can never spend your money.**

> **LLM proposes. Backend validates. User authorizes. Payment executes.**

| | |
|---|---|
| **Live app** |https://agent-cart.onrender.com/|
| **API health** |[ https://agentcart-backend-p6tv.onrender.com ](https://agentcart-backend-p6tv.onrender.com/api/health)|
| **Demo logins** | customer `customer@agentcart.test` / `Customer@123` · merchant `merchant@agentcart.test` / `Merchant@123` |

---

## Problem Statement

Online stores make shoppers do the work: filter, compare spec sheets, open ten tabs. A conversational agent can do that legwork — but the moment you let an LLM near a payment flow, you inherit new risks: hallucinated prices, invented discounts, prompt injection through product descriptions, and "the model said it was paid" bugs.

**AgentCart explores how to get the convenience of an AI shopping agent without giving it financial authority.**

## Target Users

- **Customers** who know what they need ("a laptop under ₹70,000 for programming and some gaming") but not which model fits.
- **Merchants** who want to see what the agent is doing on their store — revenue, conversion through the agent, and a full audit trail of every tool call.

## Solution

A signed-in customer chats with a shopping agent. The agent can only act through five fixed backend tools (search, product details, inventory, offers, create *pending* order). Every price, stock level, discount and total comes from PostgreSQL — never from model output. The agent has **no payment tool at all**: charging requires the customer to click **Confirm & Pay**, after which the backend re-validates the order, creates a Razorpay payment, and only marks the order `PAID` after verifying Razorpay's HMAC signature server-side.

## Key Features (the five workflows)

1. **Accounts & access control** — email/password registration and login, JWT sessions, two roles (`CUSTOMER`, `MERCHANT`). Customers only ever see their own orders, payments and chats; the merchant dashboard is merchant-only. Merchant accounts cannot be created through sign-up.
2. **AI shopping agent** — natural-language requests → grounded product search → inventory + offer checks → recommendation. Multi-step tool calling with a bounded loop, conversation history, and an audit log of every tool call.
3. **Server-validated order creation** — the backend recomputes prices (applying only real, active offers), checks stock, rejects duplicates, and snapshots unit prices.
4. **Secure payment** — Razorpay Test Mode. Re-validation before charge, server-side signature verification, idempotent completion (stock is decremented exactly once, inside a transaction), safe retry after a failed or abandoned checkout.
5. **Merchant dashboard** — GMV, paid/failed orders, average order value, agent sessions, searches, checkouts, completed purchases, tool-call success rate, recent orders and the agent activity trail.

Plus: **My orders** history for customers, and a deterministic catalog evaluation suite (29 cases).

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, React Router | Fast SPA with typed API layer |
| Backend | Node.js 22, Express 5, TypeScript | Thin REST API over a service layer |
| Database | PostgreSQL + Prisma | Relational data (orders, inventory) needs transactions and constraints |
| AI | Groq (OpenAI-compatible API, tool calling) | Low-latency tool use |
| Payments | Razorpay (Test Mode) | Server-side order creation + HMAC signature verification |
| Auth | bcrypt (`bcryptjs`), JSON Web Tokens | Stateless sessions that work across a Vercel frontend and a separate API |
| Validation | Zod | One schema per endpoint, shared error format |
| Security | helmet, CORS allow-list, express-rate-limit | Baseline hardening |
| Tests / CI | Vitest, Supertest, Testing Library, GitHub Actions | 28 automated tests |

## Architecture

```text
Browser (React SPA)
   │  Authorization: Bearer <JWT>
   ▼
Express API ── helmet · CORS allow-list · rate limits · Zod validation
   │
   ├─ /api/auth      register · login · me
   ├─ /api/products  public catalog
   ├─ /api/chat      requireAuth ─► Agent orchestrator ─► 5 fixed tools ─┐
   ├─ /api/orders    requireAuth ─► ownership check                      │
   ├─ /api/payments  requireAuth ─► ownership ─► revalidate ─► Razorpay  │
   └─ /api/merchant  requireAuth + requireRole(MERCHANT)                 │
                                                                         ▼
                         Service layer (catalog · inventory · offers · orders · payments · audit)
                                                  │
                                              PostgreSQL
```

Key ideas (details in [docs/architecture.md](docs/architecture.md)):

- **No code path from the LLM to money.** Tools wrap the same service layer as the REST routes; `create_payment` deliberately isn't a tool.
- **Authorization is enforced in the API, not the UI.** Route guards in React only hide screens; every endpoint re-checks the token, the user's role (read from the database on each request) and resource ownership. Other users' orders return `404`, not `403`, so IDs can't be probed.
- **Server-authoritative money.** Prices are integers in paise; totals are computed server-side; Razorpay signatures are verified with a constant-time compare.

## Local Setup

**Prerequisites:** Node.js 20+, PostgreSQL 14+, a [Groq API key](https://console.groq.com) (free), Razorpay **Test Mode** keys.

```bash
git clone https://github.com/charanpatrick68/Agent-cart.git
cd Agent-cart            # or the folder you cloned into

# 1. Backend
cd backend
cp .env.example .env     # then fill in the values (see below)
npm install              # also runs `prisma generate`
npx prisma migrate deploy
npm run seed             # catalog + demo merchant/customer accounts
npm run dev              # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env     # defaults work for local dev
npm install
npm run dev              # http://localhost:5173  (proxies /api to :4000)
```

Open http://localhost:5173, create an account (or use a demo login) and ask the agent for a laptop.

**Tests**

```bash
cd backend  && npm test        # 21 tests — auth, roles, ownership, payment verification (no DB needed)
cd frontend && npm test        # 7 tests — route guards, login flow
cd backend  && npm run eval    # 29-case deterministic catalog evaluation (needs the seeded DB)
```

## Environment Variables

**Backend (`backend/.env`)** — never commit this file.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Signs login tokens. **≥ 32 random characters** (enforced when `NODE_ENV=production`) |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `GROQ_API_KEY` | for the agent | Groq API key |
| `GROQ_MODEL` | no | Default `openai/gpt-oss-20b` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for payments | Razorpay **Test Mode** keys |
| `CORS_ORIGIN` | yes in prod | Frontend origin(s), comma separated, no trailing slash |
| `TRUST_PROXY` | no | Set to `1` behind Render/Railway so rate limits see real client IPs |
| `PORT`, `NODE_ENV` | no | Defaults `4000`, `development` |
| `SEED_MERCHANT_PASSWORD`, `SEED_CUSTOMER_PASSWORD` | no | Override demo account passwords used by `npm run seed` |

**Frontend (`frontend/.env`)**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Deployed API URL (empty in local dev) |
| `VITE_DEMO_LOGINS` | `true` shows one-click demo accounts on the sign-in page |

## Deployment

Frontend on Vercel (or Netlify), API on Render, database on Neon/Render Postgres. Step-by-step instructions, including the Razorpay and CORS settings, are in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. A Render Blueprint (`render.yaml`) and SPA rewrite config are included.

## API

All routes are under `/api`. 🔒 = needs `Authorization: Bearer <token>`; 🏪 = merchant role only.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | Server + database health |
| POST | `/auth/register` | – | Create a customer account → `{ user, token }` |
| POST | `/auth/login` | – | Sign in → `{ user, token }` |
| GET | `/auth/me` | 🔒 | Current user |
| GET | `/products`, `/products/:id`, `/products/:id/inventory`, `/products/meta/categories` | – | Public catalog |
| POST | `/chat` | 🔒 | Send a message to the shopping agent (rate-limited) |
| GET | `/chat/:sessionId/history`, `/chat/:sessionId/audit` | 🔒 owner | Own conversation / tool-call trail |
| POST | `/orders` | 🔒 | Create a pending order (server-priced) |
| GET | `/orders` | 🔒 | My orders |
| GET | `/orders/:id` | 🔒 owner | Order details |
| POST | `/payments/create` | 🔒 owner | Re-validate and create Razorpay payment |
| POST | `/payments/verify` | 🔒 owner | Verify Razorpay signature, mark `PAID` |
| POST | `/payments/abandon` | 🔒 owner | Mark an abandoned checkout retryable |
| GET | `/merchant/overview`, `/merchant/orders`, `/merchant/activity` | 🏪 | Dashboard data |

Errors always look like `{ "error": { "code": "…", "message": "…" } }`.

## Security Notes

- Passwords are hashed with bcrypt (cost 12); plaintext is never stored or logged. Login returns the same error for unknown email and wrong password and does equal work for both.
- JWTs are HS256 with the algorithm pinned on verification; the user and role are re-read from the database on every request, so deleting an account or changing a role takes effect immediately.
- Public sign-up can only create `CUSTOMER` accounts; a `role` field in the request body is ignored.
- Orders, payments and chat sessions are scoped to their owner. Rate limits apply to auth endpoints (per IP) and the LLM-backed chat endpoint (per user).
- Secrets live in environment variables; `.env` is git-ignored. Production refuses to boot with a short `JWT_SECRET`.
- **Trade-off:** the token is kept in `localStorage` (simple and works across separate frontend/API domains). That makes an XSS bug more serious than with an `HttpOnly` cookie; the app renders no user HTML and ships helmet defaults on the API. Moving to cookies would need `SameSite=None` + CSRF protection and is the next hardening step.
- Known limitation: no email verification or password reset yet.

## Evaluation Results

`npm run eval` runs 29 deterministic cases against the seeded catalog (budgets, brands, multi-constraint queries, out-of-stock, impossible requirements, cross-sell):

```text
Price violation rate:                       0.00%
Category violation rate:                    0.00%
Brand violation rate:                       0.00%
Out-of-stock violations:                   0
Impossible constraints returning results:   0/3
Expected-result cases returning empty:      0/26
```

## Project Structure

```text
backend/
  prisma/              schema, migrations, seed
  src/
    app.ts, index.ts   app factory / server bootstrap
    agent/             orchestrator, system prompt, tool schemas, 5 tools
    controllers/ routes/ validators/ services/ middleware/ config/ utils/
    tests/             Vitest + Supertest (in-memory Prisma fake)
    eval/              catalog + agent evaluation
frontend/
  src/ components/ context/ hooks/ pages/{auth,customer,merchant}/ services/ test/
docs/                  architecture.md, DEPLOYMENT.md, SUBMISSION.md
render.yaml            Render Blueprint for the API
.github/workflows/     CI (typecheck, test, build for both apps)
```

## Origins & Originality

AgentCart began as my entry to the Razorpay AI Buildathon 2026 (Track 1). For this end-term submission I extended it with user accounts, role-based access, per-user data ownership, order history, security hardening, automated tests, CI and deployment configuration. The commit history shows both phases. It uses open-source libraries (Express, Prisma, React, Vite, Tailwind, Zod, etc.) as listed in the `package.json` files; no existing application was forked.

## AI Usage

AI assistants (Claude, and Groq-hosted models inside the product itself) were used for code generation, refactoring, tests and documentation. All behaviour was reviewed and verified with the automated tests above.

## License

No open-source license has been specified.
