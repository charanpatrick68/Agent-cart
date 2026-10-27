import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/services/api";
import { AuthLayout, Field } from "@/pages/auth/AuthLayout";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from ?? "/shop"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Same rule the API enforces; checked here too so the user gets instant feedback.
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate(from ?? "/shop", { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't create your account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Shop with the AI agent and pay securely with Razorpay.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" state={{ from }} className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
