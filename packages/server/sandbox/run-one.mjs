import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { DeepSeekHarness } from "@deepseek-ai/dsh-sdk-client";
import { chromium } from "playwright";

function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function processIsRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

async function startBrowser() {
  const browser = spawn(chromium.executablePath(), [
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=9222",
    "--user-data-dir=/openmuse/browser-profile",
    "about:blank",
  ], {
    stdio: "ignore",
    env: {
      PATH: process.env.PATH,
      HOME: "/openmuse/browser-profile",
      LANG: "C.UTF-8",
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
      TMPDIR: "/tmp",
    },
  });
  let launchError;
  browser.once("error", (error) => { launchError = error; });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (launchError) throw new Error("BROWSER_START_FAILED", { cause: launchError });
    if (!processIsRunning(browser)) throw new Error("BROWSER_EXITED_DURING_STARTUP");
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version", { signal: AbortSignal.timeout(500) });
      if (response.ok) return browser;
    } catch {}
    await sleep(250);
  }
  await stopBrowser(browser);
  throw new Error("BROWSER_START_TIMEOUT");
}

async function stopBrowser(browser) {
  if (!browser || !processIsRunning(browser)) return;
  browser.kill("SIGTERM");
  for (let attempt = 0; attempt < 50 && processIsRunning(browser); attempt += 1) await sleep(100);
  if (processIsRunning(browser)) browser.kill("SIGKILL");
}

async function readRequest() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk.toString("utf8");
  const line = input.trim();
  if (!line || Buffer.byteLength(line) > 48 * 1024 * 1024) throw new Error("INVALID_RUN_REQUEST");
  return JSON.parse(line);
}

const request = await readRequest();
if (typeof request.sessionId !== "string" || !(typeof request.prompt === "string" || Array.isArray(request.prompt))) throw new Error("INVALID_RUN_REQUEST");
const sessionKey = createHash("sha256").update(request.sessionId).digest("hex");
const dshHome = `/openmuse/dsh-home/${sessionKey}`;
const workspace = "/openmuse/workspace";
const browserProfile = "/openmuse/browser-profile";
await Promise.all([dshHome, workspace, browserProfile, `${workspace}/.openmuse/skills`].map((path) => mkdir(path, { recursive: true })));

const allowedEnv = {
  PATH: process.env.PATH,
  LANG: "C.UTF-8",
  HOME: dshHome,
  DSH_HOME: dshHome,
  TMPDIR: "/tmp",
  NODE_ENV: "production",
  DEEPSEEK_API_KEY: process.env.OPENMUSE_DSH_API_KEY,
  DEEPSEEK_BASE_URL: process.env.OPENMUSE_DEEPSEEK_BASE_URL,
};
let browser;
let harness;
try {
  browser = await startBrowser();
  harness = new DeepSeekHarness({
    profile: "sdk",
    patches: ["/opt/openmuse/openmuse.patch.yml", "/opt/openmuse/openmuse.browser.patch.yml"],
    dshHome,
    cwd: workspace,
    processCwd: workspace,
    provider: "deepseek-official",
    model: process.env.OPENMUSE_DSH_MODEL ?? "deepseek-flash",
    maxTokens: 8192,
    env: allowedEnv,
  });
  const result = await harness.run(request.prompt, {
    sessionId: request.sessionId,
    onNotification: (notification) => {
      const params = notification.params ?? {};
      const event = params.event && typeof params.event === "object" ? params.event : {};
      output({
        type: "notification",
        notification: {
          method: notification.method,
          params: {
            sessionId: typeof params.sessionId === "string" ? params.sessionId : undefined,
            status: typeof params.status === "string" ? params.status : undefined,
            event: { type: typeof event.type === "string" ? event.type : undefined },
          },
        },
      });
    },
  });
  output({ type: "result", finalResponse: result.finalResponse });
} catch (error) {
  output({ type: "error", message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  try {
    await harness?.close();
  } finally {
    await stopBrowser(browser);
  }
}
