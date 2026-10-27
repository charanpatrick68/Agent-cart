import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/merchant", label: "Overview" },
  { to: "/merchant/orders", label: "Orders" },
  { to: "/merchant/activity", label: "Agent activity" },
];

export function MerchantNav() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-display text-lg text-ink">
            AgentCart
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={pathname === l.to ? "font-medium text-ink" : "text-ink-muted hover:text-ink"}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/shop" className="text-ink-muted hover:text-ink">
            Customer view
          </Link>
          {user && (
            <>
              <span className="hidden text-ink-muted sm:inline">{user.name}</span>
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
          )}
        </div>
      </div>
    </header>
  );
}
