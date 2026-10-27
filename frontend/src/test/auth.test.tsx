import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";

type Handler = (body: any) => { status: number; json: unknown };

/** Replaces fetch with a tiny router so the real api client + AuthContext run unchanged. */
function mockApi(routes: Record<string, Handler>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ path: url, init });
      const handler = routes[`${init?.method ?? "GET"} ${url}`];
      if (!handler) return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "nope" } }), { status: 404 });
      const { status, json } = handler(init?.body ? JSON.parse(String(init.body)) : undefined);
      return new Response(JSON.stringify(json), { status });
    })
  );
  return calls;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

const customer = { id: "u1", name: "Casey Customer", email: "casey@example.com", role: "CUSTOMER", createdAt: "2026-01-01T00:00:00Z" };
const merchant = { ...customer, id: "u2", name: "Mel Merchant", email: "mel@example.com", role: "MERCHANT" };

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("route protection", () => {
  it("sends signed-out visitors from /shop to the login page", async () => {
    mockApi({});
    renderAt("/shop");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows a 403 page when a customer opens the merchant dashboard", async () => {
    localStorage.setItem("agentcart.token", "tok");
    mockApi({ "GET /api/auth/me": () => ({ status: 200, json: { user: customer } }) });
    renderAt("/merchant");
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument();
  });

  it("lets a merchant open the dashboard", async () => {
    localStorage.setItem("agentcart.token", "tok");
    mockApi({
      "GET /api/auth/me": () => ({ status: 200, json: { user: merchant } }),
      "GET /api/merchant/overview": () => ({
        status: 200,
        json: {
          revenue: { gmv: 0, totalOrders: 0, paidOrders: 0, failedOrders: 0, averageOrderValue: 0 },
          agentMetrics: { totalSessions: 0, searchCalls: 0, checkoutsInitiated: 0, completedPurchases: 0, toolCallSuccessRate: 0 },
        },
      }),
    });
    renderAt("/merchant");
    expect(await screen.findByText("Revenue overview")).toBeInTheDocument();
  });

  it("discards a stored token the server rejects and returns to login", async () => {
    localStorage.setItem("agentcart.token", "expired");
    mockApi({
      "GET /api/auth/me": () => ({ status: 401, json: { error: { code: "INVALID_TOKEN", message: "Your session has expired." } } }),
    });
    renderAt("/orders");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(localStorage.getItem("agentcart.token")).toBeNull();
  });
});

describe("login form", () => {
  it("shows the server's error for wrong credentials and stays signed out", async () => {
    mockApi({
      "POST /api/auth/login": () => ({ status: 401, json: { error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password" } } }),
    });
    renderAt("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "casey@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
    expect(localStorage.getItem("agentcart.token")).toBeNull();
  });

  it("stores the token, sends it on later requests, and lands on the shop", async () => {
    const calls = mockApi({
      "POST /api/auth/login": () => ({ status: 200, json: { user: customer, token: "jwt-123" } }),
    });
    renderAt("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "casey@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct horse battery");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("What are you shopping for?")).toBeInTheDocument());
    expect(localStorage.getItem("agentcart.token")).toBe("jwt-123");
    expect(calls[0].path).toBe("/api/auth/login");
  });

  it("explains a network failure instead of crashing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAt("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "casey@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "whatever1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach the server/i);
  });
});
