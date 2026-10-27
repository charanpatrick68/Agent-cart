# Submission kit

Everything needed for the end-term submission form (deadline **27 Oct 2026, 11:59 PM IST**).

## Form fields

```text
Project Name:        AgentCart

Student Name:        <your name>

Problem Statement:   Letting an LLM shop for you is convenient but risky: models hallucinate
                     prices and discounts, can be prompt-injected through product text, and
                     must never be trusted to confirm a payment. AgentCart is an AI shopping
                     assistant that finds and prepares orders for signed-in customers while
                     guaranteeing the AI has no authority over money — prices and stock come
                     from the database, charging needs an explicit user click, and payments
                     are verified server-side.

GitHub Repository:   https://github.com/charanpatrick68/Agent-cart

Deployed Application: <FRONTEND_URL>   (API health: <BACKEND_URL>/api/health)
                      Demo logins — customer: customer@agentcart.test / Customer@123
                                    merchant: merchant@agentcart.test / Merchant@123

Demo Video:          <DEMO_VIDEO_URL>

Tech Stack:          React 19 + Vite + TypeScript + Tailwind · Node.js/Express 5 + TypeScript ·
                     PostgreSQL + Prisma · Groq LLM tool-calling · Razorpay (Test Mode) ·
                     JWT + bcrypt auth · Zod · Vitest/Supertest/Testing Library · GitHub Actions ·
                     Vercel + Render + Neon

Major Features:      1) Email/password accounts with customer & merchant roles and per-user
                        data ownership  2) AI shopping agent with 5 grounded tools and audit log
                     3) Server-validated orders (prices, stock, offers)  4) Razorpay payment with
                        server-side signature verification, idempotency and safe retry
                     5) Merchant dashboard (revenue, agent funnel, activity trail) + order history
```

## Demo video script (≈ 4 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00 | Landing page | The problem: AI agents that can spend money are risky. Who it's for: shoppers and merchants. |
| 0:30 | Register a new customer; show `/shop` redirect when signed out | Accounts, JWT sessions, route guards. |
| 1:00 | Ask for a laptop under ₹70,000 | Agent searches the real catalog; every number is from the database. |
| 1:45 | "I'll take it" → order card | Backend computed the total; the agent has no payment tool. |
| 2:15 | Confirm & Pay → Razorpay test card | Re-validation, server-side signature check, order marked PAID. |
| 2:50 | My orders; open the order URL in a second account → 404 | Ownership enforcement. |
| 3:15 | Sign in as merchant → dashboard + agent activity | Revenue, funnel metrics, audit trail; customer gets a 403 here. |
| 3:50 | GitHub: commit history, CI badge/green run, `npm test` output | 28 automated tests, CI, docs. |

Tips: record at 1080p, keep the browser zoom ≥ 110 %, don't read code, and open the API health URL a minute earlier so the free-tier server is awake.

## What's already done vs. what only you can do

| Checklist item | Status |
|---|---|
| Functional application, core workflows | ✅ implemented; auth/ownership/payment logic covered by 28 tests |
| Auth + authorization | ✅ register/login/JWT, roles, ownership |
| Error handling (invalid input, failed network, unauthorized, missing resources, duplicates, failed external APIs) | ✅ |
| No secrets in repo | ✅ `.env` ignored, never committed (verified against git history). **Rotate any key that has ever been pasted into chat/screenshots.** |
| Meaningful git history | ✅ logical commits for each layer |
| README with required sections, architecture, env vars | ✅ — fill in the three placeholder URLs |
| Deployment config | ✅ `render.yaml`, `vercel.json`, CI — **you must click through the deploy** ([DEPLOYMENT.md](DEPLOYMENT.md)) |
| Demo video | ⬜ record it (script above) |
| Links open in incognito | ⬜ check after deploying |
| Submit the Google Form | ⬜ <https://forms.gle/sBy4sfqyiRG2Zpom9> |
