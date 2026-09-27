import { createHash } from "node:crypto";
import { chmod } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DeepSeekHarness, type HarnessNotification, type SdkPromptContentBlock } from "@deepseek-ai/dsh-sdk-client";
import { Sandbox, type CommandHandle } from "e2b";
import type { PoolClient } from "pg";

import { env } from "./env.js";
import { createModelProxyToken } from "./model-proxy-token.js";
import { pool } from "./db.js";
import { userWorkspaceLockKey, withSessionLock, withSessionLockOnClient } from "./session-lock.js";
import { ensureUserWorkspace } from "./workspace.js";
import { userVolume } from "./volumes.js";

const openMusePatch = resolve(dirname(fileURLToPath(import.meta.url)), "../openmuse.patch.yml");
const e2bCommand = "node /opt/openmuse/run-one.mjs";

type LocalRuntimeEntry = { harness: DeepSeekHarness; idleTimer: NodeJS.Timeout | null };
type ActiveSandbox = { sandbox?: Sandbox; command?: CommandHandle; abortController: AbortController };
type RunInput = {
  userId: string;
  sessionId: string;
  prompt: string | SdkPromptContentBlock[];
  lockClient?: PoolClient;
  onNotification?: (notification: HarnessNotification) => void;
};

function runtimeKey(userId: string, sessionId: string) {
  return `${userId}\0${sessionId}`;
}

function runtimeEnvironment(home: string): NodeJS.ProcessEnv {
  const allowed = ["PATH", "LANG", "LC_ALL", "TMPDIR", "SSL_CERT_FILE", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"];
  const child: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of allowed) if (process.env[key]) child[key] = process.env[key];
  child.HOME = home;
  child.DSH_HOME = home;
  child.TMPDIR = process.env.TMPDIR ?? "/tmp";
  if (env.dshApiKey) child.DEEPSEEK_API_KEY = env.dshApiKey;
  return child;
}

function e2bOptions() {
  return env.e2bApiOptions;
}

export class DshRuntimeManager {
  readonly #localEntries = new Map<string, LocalRuntimeEntry>();
  readonly #activeSandboxes = new Map<string, ActiveSandbox>();

  async #getLocal(userId: string, sessionId: string) {
    const key = runtimeKey(userId, sessionId);
    let entry = this.#localEntries.get(key);
    if (!entry) {
      const { accountPath, workspace, dshHome } = await ensureUserWorkspace(userId, sessionId);
      await Promise.all([accountPath, workspace, dshHome].map((path) => chmod(path, 0o700)));
      const harness = new DeepSeekHarness({
        profile: "sdk",
        patches: [openMusePatch],
        dshHome,
        cwd: workspace,
        processCwd: workspace,
        provider: env.dshProvider,
        model: env.dshModel,
        maxTokens: 8192,
        env: runtimeEnvironment(accountPath),
      });
      entry = { harness, idleTimer: null };
      this.#localEntries.set(key, entry);
    }
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
    return { key, entry };
  }

  async run(input: RunInput) {
    if (env.sandboxProvider === "e2b") {
      // One writable user volume is mounted into a single active microVM at a time.
      const key = runtimeKey(input.userId, input.sessionId);
      const active: ActiveSandbox = { abortController: new AbortController() };
      this.#activeSandboxes.set(key, active);
      try {
        const run = () => this.#runE2b(input, active);
        return input.lockClient
          ? await withSessionLockOnClient(input.lockClient, userWorkspaceLockKey(input.userId), run)
          : await withSessionLock(pool, userWorkspaceLockKey(input.userId), run);
      } finally {
        if (this.#activeSandboxes.get(key) === active) this.#activeSandboxes.delete(key);
      }
    }
    return this.#runLocal(input);
  }

  async #runLocal(input: RunInput) {
    const { entry } = await this.#getLocal(input.userId, input.sessionId);
    try {
      return await entry.harness.run(input.prompt, {
        sessionId: input.sessionId,
        onNotification: input.onNotification,
      });
    } finally {
      entry.idleTimer = setTimeout(() => {
        void this.#closeLocalEntry(runtimeKey(input.userId, input.sessionId), entry);
      }, env.dshIdleMs);
      entry.idleTimer.unref();
    }
  }

  async #runE2b(input: RunInput, active: ActiveSandbox) {
    if (active.abortController.signal.aborted) throw new Error("RUN_STOPPED");
    let outputBuffer = "";
    let finalResponse: string | undefined;
    let runnerError: string | undefined;
    const consumeOutput = async (chunk: string) => {
      outputBuffer += chunk;
      while (true) {
        const newline = outputBuffer.indexOf("\n");
        if (newline < 0) break;
        const line = outputBuffer.slice(0, newline);
        outputBuffer = outputBuffer.slice(newline + 1);
        if (!line) continue;
        if (Buffer.byteLength(line) > 8 * 1024 * 1024) throw new Error("SANDBOX_OUTPUT_TOO_LARGE");
        const event = JSON.parse(line) as { type?: string; finalResponse?: unknown; message?: unknown; notification?: { method?: unknown; params?: { status?: unknown; event?: { type?: unknown }; sessionId?: unknown } } };
        if (event.type === "result") finalResponse = typeof event.finalResponse === "string" ? event.finalResponse : "";
        else if (event.type === "error") runnerError = typeof event.message === "string" ? event.message : "DSH_RUN_FAILED";
        else if (event.type === "notification" && event.notification) {
          const notification = event.notification;
          input.onNotification?.({
            jsonrpc: "2.0",
            method: typeof notification.method === "string" ? notification.method : "session.event",
            params: notification.params ?? {},
          } as HarnessNotification);
        }
      }
      if (Buffer.byteLength(outputBuffer) > 8 * 1024 * 1024) throw new Error("SANDBOX_OUTPUT_TOO_LARGE");
    };

    try {
      const volume = await userVolume(input.userId, input.lockClient);
      const sandbox = await Sandbox.create(env.e2bTemplate, {
        ...e2bOptions(),
        volumeMounts: { "/openmuse": volume },
        metadata: {
          app: "openmuse",
          owner: createHash("sha256").update(input.userId).digest("hex").slice(0, 24),
          session: createHash("sha256").update(input.sessionId).digest("hex").slice(0, 24),
        },
        allowInternetAccess: true,
        timeoutMs: env.e2bRunTimeoutMs,
        lifecycle: { onTimeout: { action: "kill" } },
        signal: active.abortController.signal,
      });
      active.sandbox = sandbox;
      if (active.abortController.signal.aborted) throw new Error("RUN_STOPPED");
      const command = await sandbox.commands.run(e2bCommand, {
        background: true,
        stdin: true,
        cwd: "/opt/openmuse",
        timeoutMs: env.e2bRunTimeoutMs,
        envs: {
          OPENMUSE_DSH_MODEL: env.dshModel,
          OPENMUSE_DSH_API_KEY: createModelProxyToken(input.userId, input.sessionId, env.e2bRunTimeoutMs + 5 * 60_000),
          OPENMUSE_DEEPSEEK_BASE_URL: `${env.authUrl.replace(/\/$/u, "")}/internal/llm/deepseek/anthropic`,
        },
        onStdout: consumeOutput,
      });
      active.command = command;
      await command.sendStdin(`${JSON.stringify({ sessionId: input.sessionId, prompt: input.prompt })}\n`);
      await command.closeStdin();
      const result = await command.wait();
      if (outputBuffer.trim()) await consumeOutput("\n");
      if (result.exitCode !== 0 || runnerError) throw new Error(runnerError ?? `DSH_RUN_EXIT_${result.exitCode}`);
      if (finalResponse === undefined) throw new Error("DSH_RUN_RESULT_MISSING");
      return { sessionId: input.sessionId, finalResponse, events: [], notifications: [] };
    } finally {
      active.abortController.abort();
      await active.sandbox?.kill().catch((error) => console.error("[openmuse:e2b] sandbox cleanup failed", error));
    }
  }

  async stop(userId: string, sessionId: string) {
    const key = runtimeKey(userId, sessionId);
    const active = this.#activeSandboxes.get(key);
    if (active) {
      active.abortController.abort();
      await active.command?.kill().catch(() => undefined);
      await active.sandbox?.kill().catch(() => undefined);
      return true;
    }
    const entry = this.#localEntries.get(key);
    if (!entry) return false;
    await this.#closeLocalEntry(key, entry);
    return true;
  }

  async closeAll() {
    await Promise.all([
      ...[...this.#localEntries.entries()].map(([key, entry]) => this.#closeLocalEntry(key, entry)),
      ...[...this.#activeSandboxes.values()].map(async ({ command, sandbox, abortController }) => {
        abortController.abort();
        await command?.kill().catch(() => undefined);
        await sandbox?.kill().catch(() => undefined);
      }),
    ]);
    this.#activeSandboxes.clear();
  }

  async #closeLocalEntry(key: string, entry: LocalRuntimeEntry) {
    if (this.#localEntries.get(key) !== entry) return;
    this.#localEntries.delete(key);
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
    try {
      await entry.harness.close();
    } catch (error) {
      console.error("[openmuse:dsh] failed to stop runtime", error);
    }
  }
}

export const dshRuntime = new DshRuntimeManager();
