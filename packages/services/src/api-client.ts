"use client";

// Calls go through the Next.js proxy (`/api/*` → backend) so they are
// same-origin and the Better Auth session cookie is sent automatically.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper for the Caishen backend. Sends the session cookie via
 * `credentials: "include"` and parses JSON responses.
 */
export async function apiClient<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
