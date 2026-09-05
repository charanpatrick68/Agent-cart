import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { HealthResponse } from "@/types/api";

type ConnectivityState = "checking" | "connected" | "unreachable";

export function useBackendHealth() {
  const [state, setState] = useState<ConnectivityState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await api.get<HealthResponse>("/api/health");
        if (!cancelled) {
          setHealth(result);
          setState(result.db === "ok" ? "connected" : "unreachable");
        }
      } catch {
        if (!cancelled) setState("unreachable");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { state, health };
}
