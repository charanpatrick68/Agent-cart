import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader widthClass="max-w-3xl" />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
