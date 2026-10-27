import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fake } = vi.hoisted(() => ({ fake: { current: null as any } }));

vi.mock("@/config/prisma", async () => {
  const { createFakePrisma } = await import("./fakePrisma");
  fake.current = createFakePrisma();
  return { prisma: fake.current };
});

import { createApp } from "@/app";
import { signToken } from "@/services/authService";

const app = createApp();
const state = () => fake.current.__state;

async function signUp(email: string, name = "Test User", password = "correct horse battery") {
  const res = await request(app).post("/api/auth/register").send({ name, email, password });
  return res;
}

function seedOrder(userId: string, extra: Record<string, unknown> = {}) {
  const order = {
    id: `order_${state().orders.length + 1}`,
    userId,
    sessionId: null,
    status: "PENDING",
    subtotal: 50000,
    shipping: 0,
    total: 50000,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    createdAt: new Date(),
    items: [
      {
        productId: "prod_1",
        quantity: 1,
        unitPrice: 50000,
        product: { name: "Test Laptop", price: 50000, isActive: true, inventory: { quantity: 5 } },
      },
    ],
    ...extra,
  };
  state().orders.push(order);
  state().inventory["prod_1"] = 5;
  return order;
}

beforeEach(() => {
  const s = state();
  s.users.length = 0;
  s.sessions.length = 0;
  s.orders.length = 0;
  s.messages.length = 0;
});

describe("registration", () => {
  it("creates a CUSTOMER, lowercases the email and never stores the plaintext password", async () => {
    const res = await signUp("  Alice@Example.COM ");
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alice@example.com", role: "CUSTOMER" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(typeof res.body.token).toBe("string");

    const stored = state().users[0];
    expect(stored.passwordHash).not.toContain("correct horse");
    expect(stored.passwordHash.startsWith("$2")).toBe(true); // bcrypt
  });

  it("cannot be used to become a merchant", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Eve", email: "eve@example.com", password: "password123", role: "MERCHANT" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CUSTOMER");
    expect(state().users[0].role).toBe("CUSTOMER");
  });

  it("rejects a duplicate email with 409", async () => {
    await signUp("dup@example.com");
    const res = await signUp("DUP@example.com");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it.each([
    ["short password", { name: "A", email: "a@example.com", password: "short" }],
    ["bad email", { name: "A", email: "not-an-email", password: "password123" }],
    ["missing name", { email: "a@example.com", password: "password123" }],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("login and sessions", () => {
  it("logs in with the right password and rejects the wrong one", async () => {
    await signUp("bob@example.com");

    const ok = await request(app).post("/api/auth/login").send({ email: "BOB@example.com", password: "correct horse battery" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "wrong password" });
    expect(bad.status).toBe(401);
  });

  it("gives the same error for an unknown email as for a wrong password", async () => {
    await signUp("known@example.com");
    const wrong = await request(app).post("/api/auth/login").send({ email: "known@example.com", password: "wrong password" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrong password" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toEqual(wrong.body.error);
  });

  it("GET /me returns the signed-in user", async () => {
    const { body } = await signUp("me@example.com");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@example.com");
  });

  it("rejects missing, malformed, wrongly-signed, alg=none and deleted-user tokens", async () => {
    const { body } = await signUp("t@example.com");
    const userId = body.user.id;
    const get = (auth?: string) => {
      const r = request(app).get("/api/auth/me");
      return auth ? r.set("Authorization", auth) : r;
    };

    expect((await get()).status).toBe(401);
    expect((await get("Bearer garbage")).status).toBe(401);
    expect((await get(`Bearer ${jwt.sign({}, "some-other-secret", { subject: userId })}`)).status).toBe(401);

    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(
      JSON.stringify({ sub: userId })
    ).toString("base64url")}.`;
    expect((await get(`Bearer ${none}`)).status).toBe(401);

    const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: userId, expiresIn: -10 });
    expect((await get(`Bearer ${expired}`)).status).toBe(401);

    state().users.length = 0; // account deleted after the token was issued
    expect((await get(`Bearer ${body.token}`)).status).toBe(401);
  });
});

describe("role-based access", () => {
  it("keeps merchant endpoints away from anonymous users and customers", async () => {
    const customer = (await signUp("cust@example.com")).body;

    expect((await request(app).get("/api/merchant/orders")).status).toBe(401);

    const asCustomer = await request(app).get("/api/merchant/orders").set("Authorization", `Bearer ${customer.token}`);
    expect(asCustomer.status).toBe(403);
    expect(asCustomer.body.error.code).toBe("FORBIDDEN");
  });

  it("lets a merchant in", async () => {
    state().users.push({ id: "merchant_1", name: "Shop", email: "shop@example.com", role: "MERCHANT", passwordHash: "x", createdAt: new Date() });
    const token = signToken({ id: "merchant_1", role: "MERCHANT" });
    const res = await request(app).get("/api/merchant/orders").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("uses the role stored in the database, not the one inside the token", async () => {
    const customer = (await signUp("sneaky@example.com")).body;
    const forged = signToken({ id: customer.user.id, role: "MERCHANT" }); // validly signed, but DB says CUSTOMER
    const res = await request(app).get("/api/merchant/orders").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(403);
  });

  it("requires sign-in for chat", async () => {
    const res = await request(app).post("/api/chat").send({ message: "hello" });
    expect(res.status).toBe(401);
  });

  it("keeps the product catalog public", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});

describe("order and payment ownership", () => {
  it("only lets the owner read an order — others get 404, not 403", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const mallory = (await signUp("mallory@example.com")).body;
    const order = seedOrder(alice.user.id);

    expect((await request(app).get(`/api/orders/${order.id}`)).status).toBe(401);
    expect((await request(app).get(`/api/orders/${order.id}`).set("Authorization", `Bearer ${alice.token}`)).status).toBe(200);
    expect((await request(app).get(`/api/orders/${order.id}`).set("Authorization", `Bearer ${mallory.token}`)).status).toBe(404);
  });

  it("lists only the caller's own orders", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const bob = (await signUp("bob@example.com")).body;
    seedOrder(alice.user.id);
    seedOrder(alice.user.id);
    seedOrder(bob.user.id);

    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
  });

  it("blocks other users from creating, verifying or abandoning payment on an order", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const mallory = (await signUp("mallory@example.com")).body;
    const order = seedOrder(alice.user.id, { status: "PAYMENT_PENDING", razorpayOrderId: "order_rzp_1" });
    const as = (r: request.Test) => r.set("Authorization", `Bearer ${mallory.token}`);

    expect((await as(request(app).post("/api/payments/create").send({ orderId: order.id }))).status).toBe(404);
    expect(
      (
        await as(
          request(app).post("/api/payments/verify").send({
            orderId: order.id,
            razorpay_order_id: "order_rzp_1",
            razorpay_payment_id: "pay_1",
            razorpay_signature: "sig",
          })
        )
      ).status
    ).toBe(404);
    expect((await as(request(app).post("/api/payments/abandon").send({ orderId: order.id }))).status).toBe(404);
    expect(order.status).toBe("PAYMENT_PENDING"); // untouched
  });

  it("marks an order PAID only for a valid Razorpay signature, and only decrements stock once", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const order = seedOrder(alice.user.id, { status: "PAYMENT_PENDING", razorpayOrderId: "order_rzp_1" });
    const auth = { Authorization: `Bearer ${alice.token}` };

    const forged = await request(app)
      .post("/api/payments/verify")
      .set(auth)
      .send({ orderId: order.id, razorpay_order_id: "order_rzp_1", razorpay_payment_id: "pay_1", razorpay_signature: "f".repeat(64) });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe("INVALID_SIGNATURE");
    expect(order.status).toBe("FAILED");
    expect(state().inventory["prod_1"]).toBe(5);

    // Retry after the failure is allowed; now with a genuine signature.
    order.status = "PAYMENT_PENDING";
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update("order_rzp_1|pay_1").digest("hex");
    const body = { orderId: order.id, razorpay_order_id: "order_rzp_1", razorpay_payment_id: "pay_1", razorpay_signature: signature };

    const ok = await request(app).post("/api/payments/verify").set(auth).send(body);
    expect(ok.status).toBe(200);
    expect(order.status).toBe("PAID");
    expect(state().inventory["prod_1"]).toBe(4);

    const again = await request(app).post("/api/payments/verify").set(auth).send(body);
    expect(again.status).toBe(200);
    expect(state().inventory["prod_1"]).toBe(4); // idempotent
  });

  it("does not let an abandon call downgrade a PAID order", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const order = seedOrder(alice.user.id, { status: "PAID" });
    const res = await request(app).post("/api/payments/abandon").set("Authorization", `Bearer ${alice.token}`).send({ orderId: order.id });
    expect(res.body.status).toBe("PAID");
    expect(order.status).toBe("PAID");
  });
});

describe("agent session ownership", () => {
  it("hides one user's chat history and audit trail from another", async () => {
    const alice = (await signUp("alice@example.com")).body;
    const mallory = (await signUp("mallory@example.com")).body;
    state().sessions.push({ id: "sess_alice", userId: alice.user.id });

    for (const path of ["history", "audit"]) {
      const own = await request(app).get(`/api/chat/sess_alice/${path}`).set("Authorization", `Bearer ${alice.token}`);
      const other = await request(app).get(`/api/chat/sess_alice/${path}`).set("Authorization", `Bearer ${mallory.token}`);
      const anon = await request(app).get(`/api/chat/sess_alice/${path}`);
      expect(own.status).toBe(200);
      expect(other.status).toBe(404);
      expect(anon.status).toBe(401);
    }
  });
});
