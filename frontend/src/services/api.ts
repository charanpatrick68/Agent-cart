const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_KEY = "agentcart.token";

// The login token lives in localStorage so a refresh keeps you signed in.
// Every access is wrapped because storage can be unavailable (private mode,
// blocked cookies) — the app then simply behaves as "signed out".
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore — user just won't stay signed in across reloads
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

class ApiRequestError extends Error {
  status: number;
  code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

// AuthContext registers a callback here so an expired/invalid token anywhere
// in the app signs the user out and sends them to the login page.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiRequestError(0, "Can't reach the server. Check your connection and try again.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code;
    } catch {
      // response wasn't JSON — keep the generic message
    }

    // A token that the server no longer accepts (expired, account deleted).
    // Wrong-password responses are 401 too, so only react when we actually
    // sent a token and the server says the *token* is the problem.
    if (res.status === 401 && token && (code === "INVALID_TOKEN" || code === "UNAUTHENTICATED")) {
      tokenStore.clear();
      onSessionExpired?.();
    }

    throw new ApiRequestError(res.status, message, code);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};

export { ApiRequestError };
