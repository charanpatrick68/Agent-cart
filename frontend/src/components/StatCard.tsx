export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper-raised p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
