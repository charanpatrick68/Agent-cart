import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function SiteHeader({ widthClass = "max-w-6xl", extra }: { widthClass?: string; extra?: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const linkClass = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`) ? "font-medium text-ink" : "text-ink-muted hover:text-ink";

  return (
    <header className="border-b border-line">
      <div className={`mx-auto flex ${widthClass} items-center justify-between gap-4 px-6 py-4`}>
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-lg text-ink">
            AgentCart
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/shop" className={linkClass("/shop")}>
              Shop
            </Link>
            {user && (
              <Link to="/orders" className={linkClass("/orders")}>
                My orders
              </Link>
            )}
            {user?.role === "MERCHANT" && (
              <Link to="/merchant" className={linkClass("/merchant")}>
                Merchant
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {extra}
          {loading ? null : user ? (
            <>
              <span className="hidden text-ink-muted sm:inline" title={user.email}>
                {user.name}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="rounded-md border border-line px-3 py-1.5 text-ink hover:border-ink/40"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-ink-muted hover:text-ink">
                Sign in
              </Link>
              <Link to="/register" className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink hover:opacity-90">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
