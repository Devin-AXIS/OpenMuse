import { cloudBaseUrl } from "./config";

export class CloudApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

export async function cloudRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${cloudBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string } & T;
  if (!response.ok) throw new CloudApiError(response.status, body.message ?? `Request failed (${response.status})`, body.error);
  return body;
}
