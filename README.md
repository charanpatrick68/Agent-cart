# AgentCart

### From intent to checkout — AI-native commerce with controlled agentic payments.

AgentCart is an AI-powered shopping platform that lets customers describe what they want in natural language. A shopping agent interprets that intent, searches a verified product catalog, checks inventory, and prepares an order.

The critical difference is the payment boundary:

> **LLM proposes. Backend validates. User authorizes. Payment executes.**

The AI agent can reason and interact with commerce tools, but it never receives direct access to payment credentials or the ability to initiate a charge.

Built for the **Razorpay AI Buildathon 2026 — Track 1: AI Growth & Agentic Commerce.**

---

# 🚀 What AgentCart Does

A customer can simply say something like:

> "I'm a CS student looking for a laptop under ₹70,000 for programming and occasional gaming."

AgentCart then:

1. Understands the customer's shopping intent
2. Searches the verified product catalog
3. Checks product availability and inventory
4. Applies applicable offers
5. Recommends suitable products
6. Creates a server-validated pending order
7. Shows the final amount to the customer
8. Requires explicit user confirmation
9. Creates the Razorpay payment
10. Verifies the payment server-side
11. Marks the order as paid only after successful verification

The result is an agentic shopping experience without giving the AI direct financial authority.

---

# 🧠 Core Architecture

```text
                    CUSTOMER
                       │
                       ▼
              Natural-language intent
                       │
                       ▼
              ┌─────────────────┐
              │   AI Shopping   │
              │      Agent      │
              │  Google Gemini  │
              └────────┬────────┘
                       │
                 Fixed tools
                       │
                       ▼
              ┌─────────────────┐
              │     Backend     │
              │ Node + Express  │
              └───────┬─────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   PostgreSQL      Inventory     Offers
        │
        ▼
   Pending Order
        │
        ▼
   USER CONFIRMS
        │
        ▼
   Razorpay Checkout
        │
        ▼
 Server-side signature verification
        │
        ▼
      PAID
```

---

# 🔐 The Payment Safety Boundary

AgentCart deliberately separates **AI reasoning** from **financial execution**.

The agent has five commerce tools:

```text
search_products
get_product
check_inventory
get_offer
create_pending_order
```

There is intentionally **no payment tool exposed to the LLM**.

The payment flow is:

```text
Customer: "I want this laptop."

Agent:
  search_products
  check_inventory
  → recommends a product

Customer:
  "I'll take it."

Agent:
  create_pending_order
  → creates a PENDING order
  → server calculates the total

Frontend:
  shows "Confirm & Pay ₹XX,XXX"

Customer:
  clicks "Confirm & Pay"

Backend:
  re-validates price + inventory
  → creates Razorpay order

Razorpay:
  processes checkout
  → returns payment signature

Backend:
  verifies signature server-side
  → marks order PAID
```

### The key security principle

> **AI has reasoning power, but not financial authority.**

Prices, inventory, discounts and order totals are calculated and validated by the backend rather than trusted from LLM output.

---

# ✨ Features

## AI Shopping Agent

- Natural-language shopping requests
- Google Gemini tool/function calling
- Structured commerce tools
- Product recommendations grounded in the database
- Multi-step agent orchestration
- Session history
- Agent audit logging

## Verified Commerce Backend

- PostgreSQL product catalog
- Product search and filtering
- Inventory validation
- Product details
- Offer/discount handling
- Server-side order calculation
- Pending-order workflow
- Order lifecycle management

## Secure Payments

- Razorpay Test Mode integration
- Server-side payment creation
- Server-side signature verification
- Payment idempotency
- Explicit user authorization
- No payment capability exposed to the LLM

## Merchant Dashboard

- Revenue overview
- GMV
- Paid orders
- Failed orders
- Average order value
- Agent sessions
- Searches performed
- Checkouts initiated
- Completed purchases
- Tool-call success rate
- Agent activity/audit trail

## Evaluation

AgentCart includes a deterministic catalog evaluation suite that validates:

- Price constraints
- Category constraints
- Brand constraints
- Inventory constraints
- Impossible requirements
- Multi-constraint queries
- Out-of-stock handling
- Cross-sell scenarios

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | Google Gemini API |
| Payments | Razorpay Test Mode |
| Validation | Zod |

---

# 📁 Project Structure

```text
agentcart/
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       │   ├── customer/
│       │   └── merchant/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── utils/
│
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── orchestrator.ts
│   │   │   ├── systemPrompt.ts
│   │   │   ├── toolSchemas.ts
│   │   │   └── tools/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── validators/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── eval/
│   │
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/
│
├── docs/
│   └── architecture.md
│
├── README.md
└── .gitignore
```

---

# ⚙️ Local Setup

## Prerequisites

- Node.js 20+
- PostgreSQL
- Google Gemini API key
- Razorpay Test Mode credentials

---

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd agentcart
```

---

## 2. Configure the backend

```bash
cd backend
```

Create your environment file:

```bash
cp .env.example .env
```

Add the required environment variables:

```env
DATABASE_URL=your_postgresql_connection_string

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_gemini_model

RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
```

Never commit `.env` or expose secret keys publicly.

---

## 3. Install backend dependencies

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

Seed the demo catalog:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:4000
```

---

## 4. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

Open the displayed frontend URL in your browser.

---

# 🔌 API

All API routes are mounted under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server and database health |
| GET | `/products` | Search and list products |
| GET | `/products/:id` | Product details |
| GET | `/products/:id/inventory` | Live inventory |
| GET | `/products/meta/categories` | Product categories |
| POST | `/chat` | Send a message to the shopping agent |
| GET | `/chat/:sessionId/history` | Conversation history |
| GET | `/chat/:sessionId/audit` | Agent audit trail |
| POST | `/orders` | Create a pending order |
| GET | `/orders/:id` | Order details |
| POST | `/payments/create` | Create Razorpay payment |
| POST | `/payments/verify` | Verify Razorpay payment |
| POST | `/payments/abandon` | Abandon a checkout |
| GET | `/merchant/overview` | Merchant metrics |
| GET | `/merchant/orders` | Recent orders |
| GET | `/merchant/activity` | Agent activity |

---

# 📊 Evaluation Results

AgentCart includes a deterministic catalog-layer evaluation suite that runs without an API key.

The evaluation contains **29 structured test cases** covering normal queries, strict budgets, brand preferences, multi-constraint queries, out-of-stock scenarios, ambiguous requests, impossible requirements, above-budget requests and cross-sell scenarios.

Results from the seeded catalog:

```text
AgentCart catalog-layer evaluation
29 cases
108 products returned

Price violation rate:                       0.00%
Category violation rate:                    0.00%
Brand violation rate:                       0.00%
Out-of-stock violations:                   0
Impossible constraints returning results:   0/3
Expected-result cases returning empty:      0/26
```

### Catalog grounding

Every product result comes directly from the backend's catalog search against PostgreSQL.

The system does not provide the LLM with a path to invent products or bypass the catalog layer.

The catalog evaluation proves that the commerce layer enforces its constraints independently of LLM behavior.

---

# 🛡️ Security Principles

### 1. The LLM cannot access the database directly

The model interacts only through a fixed set of backend tools.

### 2. The LLM cannot initiate payments

There is deliberately no payment tool exposed to the agent.

### 3. Financial values are server-authoritative

Prices, discounts, inventory and order totals are recalculated by the backend.

### 4. Payment requires explicit user authorization

The frontend initiates payment only after the customer clicks the confirmation button.

### 5. Razorpay signatures are verified server-side

A successful frontend response alone is never trusted.

### 6. Payment processing is idempotent

Repeated payment-success handling does not repeatedly decrement inventory.

### 7. Commerce data is observable

Agent tool calls are recorded through an audit trail for merchant visibility.

---

# 🎯 Why AgentCart?

Traditional e-commerce:

```text
Search → Filter → Compare → Cart → Checkout
```

Agentic commerce:

```text
Intent → Reason → Search → Validate → Recommend → Authorize → Pay
```

AgentCart explores how that transition can happen **without giving an autonomous model uncontrolled access to financial actions**.

The design principle is simple:

> **Let AI handle intent and reasoning.**
>
> **Keep validation and money movement under deterministic backend control.**

---

# 📚 Documentation

Additional architecture and design decisions are available in:

```text
docs/architecture.md
```

---

# 🧪 Demo Flow

For a complete demonstration:

1. Open the customer shopping experience
2. Enter a natural-language shopping request
3. Let the agent search the catalog
4. Review the recommendation
5. Create the pending order
6. Review the server-calculated total
7. Click **Confirm & Pay**
8. Complete the Razorpay Test Mode checkout
9. Verify the payment
10. Open the merchant dashboard
11. Review the order and agent activity

---

# ⚠️ Environment Variables

Never commit real credentials.

Keep secrets in environment variables:

```text
GEMINI_API_KEY
RAZORPAY_KEY_SECRET
DATABASE_URL
```

For production deployments, configure these through the hosting provider's secret/environment-variable system.

---

# 📄 License

Built as a hackathon submission for the **Razorpay AI Buildathon 2026**.

No open-source license has been specified yet.
