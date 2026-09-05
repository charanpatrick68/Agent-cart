# AgentCart

### From intent to checkout — AI-native commerce with controlled agentic payments.

AgentCart is an AI-powered shopping platform that lets customers describe what they want in natural language. A shopping agent interprets that intent, searches a verified product catalog, checks inventory, and prepares an order.

The critical difference is the payment boundary:

> **LLM proposes. Backend validates. User authorizes. Payment executes.**

The AI agent can reason and interact with commerce tools, but it never receives direct access to payment credentials or the ability to initiate a charge.

Built for the **Razorpay AI Buildathon 2026 — Track 1: AI Growth & Agentic Commerce.**

---

## 🚀 What AgentCart Does

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
