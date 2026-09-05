import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/merchant", label: "Overview" },
  { to: "/merchant/orders", label: "Orders" },
  { to: "/merchant/activity", label: "Agent activity" },
];

export function MerchantNav() {
  const { pathname } = useLocation();
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
        <Link to="/shop" className="text-sm text-ink-muted hover:text-ink">
          Customer view
        </Link>
      </div>
    </header>
  );
}
