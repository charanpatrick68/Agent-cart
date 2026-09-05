import { useEffect, useState } from "react";
import { MerchantNav } from "@/components/MerchantNav";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/services/api";
import type { AuditLogDTO } from "@/types/api";

export function MerchantActivityPage() {
  const [logs, setLogs] = useState<AuditLogDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ logs: AuditLogDTO[] }>("/api/merchant/activity?limit=100")
      .then((res) => setLogs(res.logs))
      .catch(() => setError("Couldn't load agent activity."));
  }, []);

  return (
    <div className="min-h-screen">
      <MerchantNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-2xl text-ink">Agent activity</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every tool call the shopping agent makes, in order — the full audit trail behind each
          recommendation and order.
        </p>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {logs && (
          <div className="mt-6 space-y-2 font-mono text-xs">
            {logs.length === 0 && <p className="text-ink-muted">No agent activity yet.</p>}
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-line bg-paper-raised p-3">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                  <StatusPill tone={log.success ? "success" : "danger"}>{log.success ? "ok" : "error"}</StatusPill>
                </div>
                <p className="mt-1 text-ink">{log.action}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-ink-muted">details</summary>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-ink-muted">
                    input: {JSON.stringify(log.input)}
                    {"\n"}output: {JSON.stringify(log.output)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
