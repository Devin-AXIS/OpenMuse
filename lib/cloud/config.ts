export const cloudBaseUrl = (
  process.env.NEXT_PUBLIC_CLOUD_API_URL ?? "http://127.0.0.1:3100"
).replace(/\/$/u, "");
