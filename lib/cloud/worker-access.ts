import { cloudBaseUrl } from "./config";

export type WorkerAccess = {
  workerId: string;
  baseUrl: string;
  accessToken: string;
  directory?: string;
};

type WorkerAccessResponse = { access?: WorkerAccess; status?: string; message?: string };

export async function getWorkerAccess(signal?: AbortSignal): Promise<WorkerAccess | null> {
  let response = await fetch(`${cloudBaseUrl}/api/v1/me/connect`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (response.status === 404) {
    await fetch(`${cloudBaseUrl}/api/v1/me/worker`, { method: "POST", credentials: "include", headers: { Accept: "application/json" }, signal });
    return null;
  }
  if (response.status === 409) return null;
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  const body = await response.json() as WorkerAccessResponse & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `WORKER_ACCESS_FAILED:${response.status}`);
  return body.access ?? null;
}
