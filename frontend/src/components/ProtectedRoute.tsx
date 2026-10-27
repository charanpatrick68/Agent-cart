import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/api";

/**
 * Route guard. Signed-out visitors are sent to /login (and returned here
 * afterwards); signed-in users without the required role see a 403 page.
 * This only hides UI — the API enforces the same rules independently.
 */
export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="p-10 text-center text-sm text-ink-muted">Checking your session…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">403</p>
        <h1 className="mt-2 font-display text-2xl text-ink">You don't have access to this page</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This area is for merchant accounts. You're signed in as {user.email}.
        </p>
        <Link to="/shop" className="mt-6 inline-block text-sm text-accent hover:underline">
          Back to shopping
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
