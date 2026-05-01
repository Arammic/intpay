export interface ApiResult<T> {
  data: T | null;
  isSucess: boolean;
  error: string[];
}

// In production we point to the relative path "/api" so that the Netlify
// proxy in netlify.toml forwards the call to the HTTP backend (avoids
// mixed-content blocks). In dev, the Vite dev server proxies the same prefix.
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

/**
 * Backend uses a unified envelope:
 * { success, message, data, meta: { statusCode, version, timestamp } }
 */
interface UnifiedEnvelope<T> {
  success: boolean;
  message?: string;
  data: T | null;
  meta?: { statusCode?: number; version?: string; timestamp?: string };
  // Some legacy endpoints return `status` instead of `meta.statusCode`.
  status?: number;
}

function formatError(env: UnifiedEnvelope<unknown>, httpStatus?: number): string {
  const code = env.meta?.statusCode ?? env.status ?? httpStatus;
  const msg = env.message?.trim() || "Request failed";
  return code ? `${msg} (status ${code})` : msg;
}

async function handle<T>(response: Response): Promise<ApiResult<T>> {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    /* ignore */
  }

  // Try to parse the body as the unified envelope first — even on non-2xx,
  // because the backend may still return { success:false, message, meta }.
  let parsed: UnifiedEnvelope<T> | null = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText) as UnifiedEnvelope<T>;
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object" && "success" in parsed) {
    if (parsed.success) {
      return { data: (parsed.data ?? null) as T | null, isSucess: true, error: [] };
    }
    return {
      data: null,
      isSucess: false,
      error: [formatError(parsed, response.status)],
    };
  }

  // Legacy envelope: { data, message, status } — no `success` field.
  if (
    parsed &&
    typeof parsed === "object" &&
    ("data" in parsed || "status" in parsed) &&
    !("card" in parsed) // don't mistake a real payload for an envelope
  ) {
    const code = (parsed as UnifiedEnvelope<T>).status ?? response.status;
    const ok = typeof code === "number" ? code >= 200 && code < 300 : response.ok;
    if (ok) {
      return {
        data: ((parsed as UnifiedEnvelope<T>).data ?? null) as T | null,
        isSucess: true,
        error: [],
      };
    }
    return {
      data: null,
      isSucess: false,
      error: [formatError(parsed as UnifiedEnvelope<unknown>, response.status)],
    };
  }

  // Fallback: not an envelope.
  if (!response.ok) {
    return {
      data: null,
      isSucess: false,
      error: [bodyText || `Request failed with status ${response.status}`],
    };
  }
  if (!bodyText) {
    return { data: null, isSucess: false, error: ["Empty response body"] };
  }
  try {
    return { data: JSON.parse(bodyText) as T, isSucess: true, error: [] };
  } catch (e) {
    return {
      data: null,
      isSucess: false,
      error: [e instanceof Error ? e.message : "Failed to parse response"],
    };
  }
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await handle<T>(response);
  } catch (error) {
    return {
      data: null,
      isSucess: false,
      error: [error instanceof Error ? error.message : "Unknown network error"],
    };
  }
}

export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
): Promise<ApiResult<TResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await handle<TResponse>(response);
  } catch (error) {
    return {
      data: null,
      isSucess: false,
      error: [error instanceof Error ? error.message : "Unknown network error"],
    };
  }
}
