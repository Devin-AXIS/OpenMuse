import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
dotenv.config({ path: resolve(repoRoot, ".env"), quiet: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

const isProduction = process.env.NODE_ENV === "production";
const authSecret = required("BETTER_AUTH_SECRET", isProduction ? undefined : "openmuse-development-secret-change-before-deploying");
const port = Number(process.env.OPENMUSE_SERVER_PORT ?? 3100);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("OPENMUSE_SERVER_PORT must be a valid TCP port.");
const authUrl = required("BETTER_AUTH_URL", "http://localhost:3100");
const smsWebhookUrl = process.env.OPENMUSE_SMS_WEBHOOK_URL;
const sandboxProvider = process.env.OPENMUSE_SANDBOX_PROVIDER ?? (isProduction ? "e2b" : "local");
const dshUpstreamBaseUrl = process.env.DEEPSEEK_UPSTREAM_BASE_URL ?? "https://api.deepseek.com/anthropic";
if (sandboxProvider !== "local" && sandboxProvider !== "e2b") throw new Error("OPENMUSE_SANDBOX_PROVIDER must be local or e2b.");
if (isProduction) {
  if (new URL(authUrl).protocol !== "https:") throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  if (new URL(dshUpstreamBaseUrl).protocol !== "https:") throw new Error("DEEPSEEK_UPSTREAM_BASE_URL must use HTTPS in production.");
  if (!smsWebhookUrl || new URL(smsWebhookUrl).protocol !== "https:") throw new Error("Configure an HTTPS OPENMUSE_SMS_WEBHOOK_URL in production.");
  if (sandboxProvider !== "e2b") throw new Error("Production requires OPENMUSE_SANDBOX_PROVIDER=e2b so agent tasks run in isolated microVMs.");
}

const e2bApiKey = process.env.OPENMUSE_E2B_API_KEY;
const e2bApiUrl = process.env.OPENMUSE_E2B_API_URL;
const e2bSandboxUrl = process.env.OPENMUSE_E2B_SANDBOX_URL;
const e2bVolumeApiUrl = process.env.OPENMUSE_E2B_VOLUME_API_URL ?? e2bApiUrl;
const e2bTemplate = process.env.OPENMUSE_E2B_TEMPLATE ?? "openmuse-dsh";
if (sandboxProvider === "e2b" && (!e2bApiKey || !e2bApiUrl || !e2bSandboxUrl || !e2bVolumeApiUrl)) {
  throw new Error("E2B sandbox mode requires OPENMUSE_E2B_API_KEY, OPENMUSE_E2B_API_URL, OPENMUSE_E2B_SANDBOX_URL, and OPENMUSE_E2B_VOLUME_API_URL.");
}
if (sandboxProvider === "e2b" && isProduction && (new URL(e2bApiUrl!).protocol !== "https:" || new URL(e2bSandboxUrl!).protocol !== "https:" || new URL(e2bVolumeApiUrl!).protocol !== "https:")) {
  throw new Error("Production E2B endpoints must use HTTPS.");
}
if (e2bVolumeApiUrl) process.env.E2B_VOLUME_API_URL = e2bVolumeApiUrl;

export const env = {
  port,
  databaseUrl: required("DATABASE_URL", isProduction ? undefined : "postgres://openmuse:openmuse@localhost:5433/openmuse"),
  authUrl,
  authSecret,
  webOrigins: (process.env.OPENMUSE_WEB_ORIGINS ?? "http://localhost:3102,http://127.0.0.1:3102,capacitor://localhost")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
  dataDir: resolve(repoRoot, process.env.OPENMUSE_DATA_DIR ?? "./data"),
  dshProvider: process.env.OPENMUSE_DSH_PROVIDER ?? "deepseek-official",
  dshModel: process.env.OPENMUSE_DSH_MODEL ?? "deepseek-flash",
  dshIdleMs: Math.max(10_000, Number(process.env.OPENMUSE_DSH_IDLE_MS ?? 300_000)),
  dshApiKey: process.env.DEEPSEEK_API_KEY,
  dshUpstreamBaseUrl,
  sandboxProvider,
  e2bApiKey,
  e2bApiUrl,
  e2bSandboxUrl,
  e2bVolumeApiUrl,
  e2bTemplate,
  e2bRunTimeoutMs: Math.min(50 * 60_000, Math.max(60_000, Number(process.env.OPENMUSE_E2B_RUN_TIMEOUT_MS ?? 20 * 60_000))),
  e2bApiOptions: {
    apiKey: e2bApiKey,
    apiUrl: e2bApiUrl,
    sandboxUrl: e2bSandboxUrl,
  },
  llmDailyRequests: Math.max(1, Number(process.env.OPENMUSE_LLM_DAILY_REQUESTS ?? 400)),
  llmDailyBytes: Math.max(1024 * 1024, Number(process.env.OPENMUSE_LLM_DAILY_BYTES ?? 100 * 1024 * 1024)),
  smsWebhookUrl,
  smsWebhookToken: process.env.OPENMUSE_SMS_WEBHOOK_TOKEN,
  isProduction,
} as const;

if (env.authSecret.length < 32 || (env.isProduction && env.authSecret === "openmuse-development-secret-change-before-deploying")) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters and must be unique in production.");
}
if (env.isProduction && !env.dshApiKey) throw new Error("DEEPSEEK_API_KEY is required in production.");
