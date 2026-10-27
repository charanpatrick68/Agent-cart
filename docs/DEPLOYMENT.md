# Deploying AgentCart

Target setup (all have free tiers): **Neon** (PostgreSQL) → **Render** (API) → **Vercel** (frontend). About 20 minutes.

> The order matters: database → API → seed → frontend → tell the API about the frontend's URL.

## 0. Before you start

- Code pushed to GitHub (`git push origin main`).
- Check no secrets are tracked: `git ls-files | grep -E '(^|/)\.env$'` must print nothing.
- A **Groq API key** (https://console.groq.com) and **Razorpay Test Mode** keys (Dashboard → switch to *Test Mode* → Settings → API Keys).
- Generate a fresh signing secret — don't reuse your local dev one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  (The Render blueprint generates one for you automatically; you only need this if deploying elsewhere.)

## 1. Database — Neon

1. Create a project at https://neon.tech (free tier doesn't expire).
2. Copy the connection string. Use the **direct** (non-pooled) one — Prisma migrations work best with it. It must end with `?sslmode=require`.

## 2. API — Render

1. Render dashboard → **New → Blueprint** → select your GitHub repo. Render reads `render.yaml` at the repo root.
2. Fill in the prompted environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `GROQ_API_KEY` | your Groq key |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Test Mode keys |
   | `CORS_ORIGIN` | put `http://localhost:5173` for now — you'll change it in step 5 |

   `NODE_ENV=production`, `TRUST_PROXY=1` and a random `JWT_SECRET` are set by the blueprint.
3. Deploy. The start command runs `prisma migrate deploy` first, so the tables are created automatically.
4. Open `https://<your-service>.onrender.com/api/health` → should show `"db":"ok"`.

> **Free-tier cold starts:** Render's free web services sleep after ~15 minutes idle and take up to a minute to wake. Open the health URL a minute before an evaluator or your demo recording needs the app.

Not using Render? Any Node host works: build with `npm ci --include=dev && npm run build`, start with `npm start`, same environment variables.

## 3. Seed the catalog and demo accounts (once)

Render's free plan has no shell, so run the seed from your own machine against the production database:

```bash
cd backend
DATABASE_URL="<neon connection string>" \
NODE_ENV=production \
SEED_MERCHANT_PASSWORD="<choose one>" \
SEED_CUSTOMER_PASSWORD="<choose one>" \
npm run seed
```

This creates 33 products with inventory, 3 offers, plus `merchant@agentcart.test` and `customer@agentcart.test`.
In production the seed refuses to run again on a populated database (it would delete orders) unless you set `SEED_FORCE=1`.

If you choose passwords other than the defaults, the one-click buttons on the sign-in page (`VITE_DEMO_LOGINS`) will not match — either keep the defaults for the public demo, or leave `VITE_DEMO_LOGINS` off and give evaluators the credentials in the submission form.

## 4. Frontend — Vercel

1. https://vercel.com → **Add New → Project** → import the same repo.
2. **Root Directory:** `frontend`. Framework preset: *Vite* (build `npm run build`, output `dist` — auto-detected).
3. Environment variables:
   - `VITE_API_BASE_URL` = `https://<your-service>.onrender.com` (no trailing slash)
   - `VITE_DEMO_LOGINS` = `true` (optional, shows demo login buttons)
4. Deploy. `frontend/vercel.json` makes deep links like `/orders` work on refresh. (On Netlify, `public/_redirects` does the same.)

## 5. Connect the two

Back on Render → your service → **Environment** → set
`CORS_ORIGIN=https://<your-app>.vercel.app` (exact origin, no trailing slash; comma-separate if you have several, e.g. a custom domain). Render restarts the service.

## 6. Verify like an evaluator (incognito window)

- [ ] Landing page loads and shows "backend + database connected".
- [ ] Visiting `/shop` while signed out redirects to the sign-in page.
- [ ] Register a new account → lands on the shop.
- [ ] Ask: *"I'm a CS student looking for a laptop under ₹70,000 for programming and occasional gaming."* → the agent recommends in-stock products.
- [ ] Say *"I'll take the CodeForge R5"* (or similar) → an order summary card appears with **Confirm & Pay**.
- [ ] Pay with Razorpay test card `4111 1111 1111 1111`, any future expiry, any CVV, any name → order shows **paid**.
- [ ] **My orders** lists it.
- [ ] Sign out, sign in as the **merchant** → dashboard shows the order; the customer account gets a 403 page on `/merchant`.
- [ ] A second customer account cannot open the first one's `/payment/<orderId>` URL.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser console: *blocked by CORS policy* | `CORS_ORIGIN` on the API must equal the frontend's exact origin (scheme + host, no trailing slash). |
| Landing page says "backend unreachable" | `VITE_API_BASE_URL` wrong or unset at **build** time — Vite bakes it in; redeploy the frontend after changing it. API may also be waking from sleep. |
| API crashes at boot with *JWT_SECRET must be at least 32 characters* | Set a longer secret (see step 0). |
| Chat returns "shopping agent is not configured" / invalid key | `GROQ_API_KEY` missing or wrong; check the Render logs. |
| Pay button fails with "Payments are not configured" | Razorpay keys missing; they must be **Test Mode** keys. |
| Deploy fails on `prisma migrate deploy` | Use Neon's *direct* connection string with `?sslmode=require`; make sure the DB is reachable from Render. |
| Everyone shares one rate-limit bucket / "too many attempts" for all users | `TRUST_PROXY=1` missing. |
