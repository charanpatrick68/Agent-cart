import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { AuthLayout, Field } from "@/pages/auth/AuthLayout";

// Shown only when the deployment opts in with VITE_DEMO_LOGINS=true, so
// evaluators can try both roles without registering. The accounts come from
// `npm run seed` on the backend.
const SHOW_DEMO = import.meta.env.VITE_DEMO_LOGINS === "true";
const DEMO_ACCOUNTS = [
  { label: "Demo customer", email: "customer@agentcart.test", password: "Customer@123" },
  { label: "Demo merchant", email: "merchant@agentcart.test", password: "Merchant@123" },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from ?? (user.role === "MERCHANT" ? "/merchant" : "/shop")} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      navigate(from ?? (signedIn.role === "MERCHANT" ? "/merchant" : "/shop"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't sign in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back — pick up where you left off.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        New to AgentCart?{" "}
        <Link to="/register" state={{ from }} className="text-accent hover:underline">
          Create an account
        </Link>
      </p>

      {SHOW_DEMO && (
        <div className="mt-8 rounded-lg border border-line bg-paper-raised p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">Demo accounts</p>
          <div className="mt-3 flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
                className="rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:border-ink/40"
              >
                {a.label} <span className="font-mono text-xs text-ink-muted">· {a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
