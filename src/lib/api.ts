/** Same-origin JSON client for /api. Errors carry the server's message and field details. */

export interface ApiFieldErrors {
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: ApiFieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequest {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  url: string;
  body?: unknown;
  keepalive?: boolean;
}

export async function api<T>(req: ApiRequest): Promise<T> {
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.body === undefined ? undefined : { "content-type": "application/json" },
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
    credentials: "same-origin",
    keepalive: req.keepalive,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: ApiFieldErrors | undefined;
    try {
      const data = (await res.json()) as { error?: string; details?: ApiFieldErrors };
      if (data.error) message = data.error;
      details = data.details;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, details);
  }
  return (await res.json()) as T;
}
