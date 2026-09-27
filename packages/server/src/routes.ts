import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { bodyLimit } from "hono/body-limit";
import { Hono, type MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import type { Pool } from "pg";
import type { SdkPromptContentBlock } from "@deepseek-ai/dsh-sdk-client";

import { auth } from "./auth.js";
import { env } from "./env.js";
import { verifyModelProxyToken } from "./model-proxy-token.js";
import { nextCronTime } from "./scheduler.js";
import { dshRuntime } from "./runtime.js";
import { withSessionLock } from "./session-lock.js";
import { deleteUserSessionRuntime, deleteWorkspaceFile, listWorkspaceFiles, readWorkspaceBinary, readWorkspaceFile, writeWorkspaceBinary, writeWorkspaceFile } from "./workspace.js";

export type AppBindings = { Variables: { user: { id: string; name: string; email: string; phoneNumber?: string | null } } };
type SessionRow = {
  id: string; title: string; runtime: string; dsh_session_id: string;
  created_at: Date; updated_at: Date; archived_at: Date | null;
};
type MemoryRow = { id: string; content: string; category: string; source_session_id: string | null; created_at: Date; updated_at: Date };
type ApiErrorStatus = 400 | 404 | 409 | 413 | 500;

const idPattern = /^[A-Za-z0-9_-]{1,128}$/u;
const app = new Hono<AppBindings>();

function apiSession(row: SessionRow) {
  return {
    id: row.id,
    title: row.title,
    runtime: row.runtime,
    time: { created: row.created_at.getTime(), updated: row.updated_at.getTime(), archived: row.archived_at?.getTime() ?? null },
  };
}

function apiMessage(row: { id: string; role: "user" | "assistant" | "system"; parts: unknown; metadata: unknown; created_at: Date }) {
  return { id: row.id, role: row.role, parts: row.parts, metadata: row.metadata, createdAt: row.created_at.getTime() };
}

function safeError(error: unknown): { status: ApiErrorStatus; message: string } {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  const messages: Record<string, { status: ApiErrorStatus; message: string }> = {
    INVALID_PATH: { status: 400, message: "Invalid workspace path." },
    SYMLINK_NOT_ALLOWED: { status: 400, message: "Symbolic links are not accessible through this API." },
    NOT_A_DIRECTORY: { status: 400, message: "The requested path is not a directory." },
    NOT_A_FILE: { status: 400, message: "The requested path is not a file." },
    FILE_TOO_LARGE: { status: 413, message: "The file is larger than the allowed limit." },
    REVISION_CONFLICT: { status: 409, message: "The file changed since it was read." },
    SCHEDULE_NO_NEXT_RUN: { status: 400, message: "The schedule has no future run." },
  };
  if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { status: 404, message: "The requested file was not found." };
  return messages[code] ?? { status: 500, message: "The OpenMuse service could not complete this request." };
}

function jsonBody<T extends Record<string, unknown>>(value: unknown): T | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as T;
}

function authRequired(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result) return c.json({ error: "AUTH_REQUIRED", message: "Please sign in." }, 401);
    c.set("user", result.user as AppBindings["Variables"]["user"]);
    await next();
  };
}

const requireUser = authRequired();
const owner = (c: Parameters<MiddlewareHandler<AppBindings>>[0]) => c.get("user").id;

async function userSession(pool: Pool, userId: string, sessionId: string) {
  const result = await pool.query<SessionRow>(
    "SELECT id, title, runtime, dsh_session_id, created_at, updated_at, archived_at FROM agent_sessions WHERE id = $1 AND user_id = $2",
    [sessionId, userId],
  );
  return result.rows[0] ?? null;
}

function parseDataUrl(url: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/u.exec(url);
  if (!match) throw new Error("INVALID_ATTACHMENT");
  const mime = match[1]!.toLowerCase();
  const data = Buffer.from(match[2]!, "base64");
  if (data.length > 8 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
  return { mime, data };
}

function attachmentName(value: unknown) {
  const name = typeof value === "string" ? basename(value.replace(/\\/gu, "/")).trim() : "";
  return (name || "attachment").slice(0, 120);
}

function cronSchedule(expression: string, timeZone: string) {
  if (expression.trim().split(/\s+/u).length !== 5 || !/^[0-9*,/\-\s]+$/u.test(expression)) throw new Error("INVALID_CRON");
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date()); }
  catch { throw new Error("INVALID_TIME_ZONE"); }
  try {
    const next = nextCronTime(expression, timeZone, new Date());
    if (!next) throw new Error("SCHEDULE_NO_NEXT_RUN");
    return next;
  } catch (error) {
    if (error instanceof Error && error.message === "SCHEDULE_NO_NEXT_RUN") throw error;
    throw new Error("INVALID_CRON");
  }
}

export function createRoutes(pool: Pool) {
  app.use("/api/v1/*", bodyLimit({ maxSize: 48 * 1024 * 1024, onError: (c) => c.json({ error: "REQUEST_TOO_LARGE" }, 413) }));
  app.use("/internal/llm/*", bodyLimit({ maxSize: 12 * 1024 * 1024, onError: (c) => c.json({ error: "REQUEST_TOO_LARGE" }, 413) }));

  app.post("/internal/llm/deepseek/anthropic/*", async (c) => {
    if (!env.dshApiKey) return c.json({ error: "MODEL_PROVIDER_UNAVAILABLE" }, 503);
    const rawPath = c.req.path.slice("/internal/llm/deepseek/anthropic".length);
    if (rawPath !== "/v1/messages" && rawPath !== "/v1/messages/count_tokens") return c.json({ error: "MODEL_ROUTE_NOT_FOUND" }, 404);
    const apiToken = c.req.header("x-api-key") ?? c.req.header("authorization")?.replace(/^Bearer\s+/iu, "");
    const claims = apiToken ? verifyModelProxyToken(apiToken) : null;
    if (!claims) return c.json({ error: "INVALID_MODEL_TOKEN" }, 401);
    const rawBody = Buffer.from(await c.req.arrayBuffer());
    let requestBody: { model?: unknown; max_tokens?: unknown };
    try { requestBody = JSON.parse(rawBody.toString("utf8")) as typeof requestBody; }
    catch { return c.json({ error: "INVALID_MODEL_REQUEST" }, 400); }
    if (requestBody.model !== env.dshModel) return c.json({ error: "MODEL_NOT_ALLOWED" }, 403);
    if (rawPath === "/v1/messages" && (typeof requestBody.max_tokens !== "number" || !Number.isSafeInteger(requestBody.max_tokens) || requestBody.max_tokens < 1 || requestBody.max_tokens > 8192)) {
      return c.json({ error: "MAX_TOKENS_LIMIT" }, 400);
    }

    const usage = await pool.query(
      `INSERT INTO llm_proxy_usage(user_id, usage_day, request_count, request_bytes)
       VALUES ($1, (now() AT TIME ZONE 'utc')::date, 1, $2)
       ON CONFLICT (user_id, usage_day) DO UPDATE
       SET request_count = llm_proxy_usage.request_count + 1,
           request_bytes = llm_proxy_usage.request_bytes + EXCLUDED.request_bytes,
           updated_at = now()
       WHERE llm_proxy_usage.request_count < $3
         AND llm_proxy_usage.request_bytes + EXCLUDED.request_bytes <= $4
       RETURNING request_count`,
      [claims.userId, rawBody.byteLength, env.llmDailyRequests, env.llmDailyBytes],
    );
    if (!usage.rowCount) return c.json({ error: "DAILY_MODEL_QUOTA_EXCEEDED" }, 429);

    const upstreamRoot = env.dshUpstreamBaseUrl.replace(/\/$/u, "");
    let upstream: Response;
    try {
      upstream = await fetch(`${upstreamRoot}${rawPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.dshApiKey,
          "anthropic-version": c.req.header("anthropic-version") ?? "2023-06-01",
          ...(c.req.header("anthropic-beta") ? { "anthropic-beta": c.req.header("anthropic-beta")! } : {}),
        },
        body: rawBody,
        signal: c.req.raw.signal,
      });
    } catch (error) {
      console.error("[openmuse:llm-proxy] upstream request failed", error instanceof Error ? error.message : "unknown error");
      return c.json({ error: "MODEL_PROVIDER_UNAVAILABLE" }, 502);
    }
    const responseHeaders = new Headers();
    for (const header of ["content-type", "cache-control", "request-id", "anthropic-ratelimit-requests-limit", "anthropic-ratelimit-requests-remaining", "anthropic-ratelimit-tokens-limit", "anthropic-ratelimit-tokens-remaining"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }
    responseHeaders.set("x-content-type-options", "nosniff");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  });

  app.get("/api/health", async (c) => {
    await pool.query("SELECT 1");
    return c.json({ ok: true, service: "openmuse-server", runtime: "dsh-sdk" });
  });
  app.get("/api/v1/me", requireUser, (c) => c.json({ user: c.get("user") }));

  app.get("/api/v1/me/summary", requireUser, (c) => c.json({
    user: c.get("user"),
    points: { balance: 0, totalEarned: 0, totalSpent: 0, updatedAt: new Date().toISOString() },
    entitlements: [],
  }));

  app.get("/api/v1/activity", requireUser, async (c) => {
    const result = await pool.query(
      `SELECT runs.id, runs.session_id, sessions.title AS session_title, runs.schedule_id, runs.trigger_kind,
        runs.runtime, runs.status, runs.error_code, runs.created_at, runs.started_at, runs.completed_at,
        (SELECT left(string_agg(part.value->>'text', ' ' ORDER BY part.ordinality), 280)
         FROM agent_messages messages,
         LATERAL jsonb_array_elements(messages.parts) WITH ORDINALITY AS part(value, ordinality)
         WHERE messages.id = runs.assistant_message_id AND part.value->>'type' = 'text') AS summary
       FROM agent_runs runs JOIN agent_sessions sessions ON sessions.id = runs.session_id
       WHERE runs.user_id = $1 ORDER BY runs.created_at DESC LIMIT 100`,
      [owner(c)],
    );
    return c.json({ activities: result.rows.map((row) => ({
      id: row.id, sessionId: row.session_id, sessionTitle: row.session_title, scheduleId: row.schedule_id,
      trigger: row.trigger_kind, runtime: row.runtime, status: row.status, errorCode: row.error_code,
      summary: row.summary, createdAt: row.created_at.getTime(), startedAt: row.started_at?.getTime() ?? null,
      completedAt: row.completed_at?.getTime() ?? null,
    })) });
  });

  app.get("/api/v1/goals", requireUser, async (c) => {
    const result = await pool.query(
      `SELECT id, source_session_id, title, description, next_action, progress, status, due_at, created_at, updated_at
       FROM user_goals WHERE user_id = $1 AND status <> 'archived' ORDER BY updated_at DESC LIMIT 100`, [owner(c)],
    );
    return c.json({ goals: result.rows.map((row) => ({
      id: row.id, sourceSessionId: row.source_session_id, title: row.title, description: row.description,
      nextAction: row.next_action, progress: row.progress, status: row.status, dueAt: row.due_at?.getTime() ?? null,
      createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime(),
    })) });
  });

  app.post("/api/v1/goals", requireUser, async (c) => {
    const body = jsonBody<{ title?: unknown; description?: unknown; nextAction?: unknown; sourceSessionId?: unknown; dueAt?: unknown }>(await c.req.json().catch(() => null));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const nextAction = typeof body?.nextAction === "string" ? body.nextAction.trim() : null;
    if (!title || title.length > 160 || description.length > 5000 || (nextAction?.length ?? 0) > 1000) return c.json({ error: "INVALID_GOAL" }, 400);
    let sourceSessionId: string | null = null;
    if (typeof body?.sourceSessionId === "string") {
      const source = await userSession(pool, owner(c), body.sourceSessionId);
      if (!source) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
      sourceSessionId = source.id;
    }
    const dueAt = typeof body?.dueAt === "number" ? new Date(body.dueAt) : null;
    if (dueAt && !Number.isFinite(dueAt.getTime())) return c.json({ error: "INVALID_GOAL_DUE_DATE" }, 400);
    const result = await pool.query(
      `INSERT INTO user_goals(id, user_id, source_session_id, title, description, next_action, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, source_session_id, title, description, next_action, progress, status, due_at, created_at, updated_at`,
      [randomUUID(), owner(c), sourceSessionId, title, description, nextAction, dueAt],
    );
    const row = result.rows[0]!;
    return c.json({ goal: { id: row.id, sourceSessionId: row.source_session_id, title: row.title, description: row.description, nextAction: row.next_action, progress: row.progress, status: row.status, dueAt: row.due_at?.getTime() ?? null, createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime() } }, 201);
  });

  app.patch("/api/v1/goals/:id", requireUser, async (c) => {
    const body = jsonBody<{ title?: unknown; description?: unknown; nextAction?: unknown; progress?: unknown; status?: unknown; dueAt?: unknown }>(await c.req.json().catch(() => null));
    if (!body || !Object.keys(body).length) return c.json({ error: "INVALID_GOAL_UPDATE" }, 400);
    if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160)) return c.json({ error: "INVALID_GOAL_TITLE" }, 400);
    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 5000)) return c.json({ error: "INVALID_GOAL_DESCRIPTION" }, 400);
    if (body.nextAction !== undefined && body.nextAction !== null && (typeof body.nextAction !== "string" || body.nextAction.length > 1000)) return c.json({ error: "INVALID_GOAL_NEXT_ACTION" }, 400);
    if (body.progress !== undefined && (!Number.isInteger(body.progress) || Number(body.progress) < 0 || Number(body.progress) > 100)) return c.json({ error: "INVALID_GOAL_PROGRESS" }, 400);
    if (body.status !== undefined && !["active", "paused", "completed", "archived"].includes(String(body.status))) return c.json({ error: "INVALID_GOAL_STATUS" }, 400);
    const dueAt = body.dueAt === null ? null : typeof body.dueAt === "number" ? new Date(body.dueAt) : undefined;
    if (dueAt && !Number.isFinite(dueAt.getTime())) return c.json({ error: "INVALID_GOAL_DUE_DATE" }, 400);
    if (body.dueAt !== undefined && body.dueAt !== null && dueAt === undefined) return c.json({ error: "INVALID_GOAL_DUE_DATE" }, 400);
    const result = await pool.query(
      `UPDATE user_goals SET title = COALESCE($3, title), description = COALESCE($4, description),
       next_action = CASE WHEN $5::boolean THEN $6 ELSE next_action END,
       progress = COALESCE($7, progress), status = COALESCE($8, status),
       due_at = CASE WHEN $9::boolean THEN $10 ELSE due_at END, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, source_session_id, title, description, next_action, progress, status, due_at, created_at, updated_at`,
      [c.req.param("id"), owner(c), typeof body.title === "string" ? body.title.trim() : null,
        typeof body.description === "string" ? body.description : null,
        body.nextAction !== undefined, typeof body.nextAction === "string" ? body.nextAction.trim() || null : null,
        typeof body.progress === "number" ? body.progress : null, typeof body.status === "string" ? body.status : null,
        body.dueAt !== undefined, dueAt ?? null],
    );
    const row = result.rows[0];
    if (!row) return c.json({ error: "GOAL_NOT_FOUND" }, 404);
    return c.json({ goal: { id: row.id, sourceSessionId: row.source_session_id, title: row.title, description: row.description, nextAction: row.next_action, progress: row.progress, status: row.status, dueAt: row.due_at?.getTime() ?? null, createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime() } });
  });

  app.delete("/api/v1/goals/:id", requireUser, async (c) => {
    const result = await pool.query("DELETE FROM user_goals WHERE id = $1 AND user_id = $2", [c.req.param("id"), owner(c)]);
    if (!result.rowCount) return c.json({ error: "GOAL_NOT_FOUND" }, 404);
    return c.json({ deleted: true });
  });

  app.get("/api/v1/sessions", requireUser, async (c) => {
    const result = await pool.query<SessionRow>(
      `SELECT id, title, runtime, dsh_session_id, created_at, updated_at, archived_at
       FROM agent_sessions WHERE user_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100`,
      [owner(c)],
    );
    return c.json({ sessions: result.rows.map(apiSession) });
  });

  app.post("/api/v1/sessions", requireUser, async (c) => {
    const body = jsonBody<{ id?: unknown; title?: unknown }>(await c.req.json().catch(() => null));
    const requestedId = typeof body?.id === "string" ? body.id : randomUUID();
    if (!idPattern.test(requestedId)) return c.json({ error: "INVALID_SESSION_ID" }, 400);
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "新对话";
    const userId = owner(c);
    const result = await pool.query<SessionRow>(
      `INSERT INTO agent_sessions(id, user_id, title, dsh_session_id)
       VALUES ($1, $2, $3, $1) ON CONFLICT (id) DO NOTHING
       RETURNING id, title, runtime, dsh_session_id, created_at, updated_at, archived_at`,
      [requestedId, userId, title],
    );
    const row = result.rows[0] ?? await userSession(pool, userId, requestedId);
    if (!row) return c.json({ error: "SESSION_ALREADY_EXISTS" }, 409);
    return c.json({ session: apiSession(row) }, result.rows[0] ? 201 : 200);
  });

  app.get("/api/v1/sessions/:sessionId", requireUser, async (c) => {
    const userId = owner(c);
    const row = await userSession(pool, userId, c.req.param("sessionId"));
    if (!row) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    const messages = await pool.query(
      `SELECT id, role, parts, metadata, created_at FROM agent_messages
       WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC LIMIT 500`,
      [row.id, userId],
    );
    return c.json({ session: apiSession(row), messages: messages.rows.map(apiMessage) });
  });

  app.patch("/api/v1/sessions/:sessionId", requireUser, async (c) => {
    const body = jsonBody<{ title?: unknown; archived?: unknown }>(await c.req.json().catch(() => null));
    if (typeof body?.title !== "string" && typeof body?.archived !== "boolean") return c.json({ error: "INVALID_SESSION_UPDATE" }, 400);
    const result = await pool.query<SessionRow>(
      `UPDATE agent_sessions SET title = COALESCE($3, title),
       archived_at = CASE WHEN $4::boolean IS NULL THEN archived_at WHEN $4 THEN now() ELSE NULL END,
       updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, runtime, dsh_session_id, created_at, updated_at, archived_at`,
      [c.req.param("sessionId"), owner(c), typeof body.title === "string" ? body.title.trim().slice(0, 160) : null, typeof body.archived === "boolean" ? body.archived : null],
    );
    if (!result.rows[0]) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    return c.json({ session: apiSession(result.rows[0]) });
  });

  app.delete("/api/v1/sessions/:sessionId", requireUser, async (c) => {
    const row = await userSession(pool, owner(c), c.req.param("sessionId"));
    if (!row) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    await dshRuntime.stop(owner(c), row.dsh_session_id);
    await pool.query("DELETE FROM agent_sessions WHERE id = $1 AND user_id = $2", [row.id, owner(c)]);
    await deleteUserSessionRuntime(owner(c), row.dsh_session_id).catch((error) => console.error("[openmuse:workspace] could not remove deleted session runtime state", error));
    return c.json({ deleted: true });
  });

  app.post("/api/v1/sessions/:sessionId/stop", requireUser, async (c) => {
    const row = await userSession(pool, owner(c), c.req.param("sessionId"));
    if (!row) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    await pool.query(
      `UPDATE agent_runs SET status = 'cancelled', error_code = 'RUN_STOPPED', completed_at = now()
       WHERE user_id = $1 AND session_id = $2 AND status IN ('queued', 'running')`, [owner(c), row.id],
    );
    return c.json({ stopped: await dshRuntime.stop(owner(c), row.dsh_session_id) });
  });

  app.post("/api/v1/sessions/:sessionId/messages", requireUser, async (c) => {
    const userId = owner(c);
    const row = await userSession(pool, userId, c.req.param("sessionId"));
    if (!row) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    const body = jsonBody<{ text?: unknown; files?: unknown; clientUserMessageId?: unknown; runtime?: unknown }>(await c.req.json().catch(() => null));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const files = Array.isArray(body?.files) ? body.files : [];
    if ((!text && files.length === 0) || text.length > 80_000 || files.length > 4) return c.json({ error: "INVALID_MESSAGE" }, 400);
    if (body?.runtime !== undefined && body.runtime !== "cloud-dsh" && body.runtime !== "ipollowork-pc") return c.json({ error: "INVALID_RUNTIME" }, 400);
    if (body?.runtime === "ipollowork-pc") return c.json({ error: "PC_RUNTIME_NOT_CONNECTED", message: "Connect iPolloWork PC before selecting its runtime." }, 409);
    const userMessageId = typeof body?.clientUserMessageId === "string" && idPattern.test(body.clientUserMessageId) ? body.clientUserMessageId : randomUUID();
    const promptBlocks: SdkPromptContentBlock[] = [];
    const visibleParts: Array<Record<string, unknown>> = [];
    const extraFileInstructions: string[] = [];
    if (text) {
      promptBlocks.push({ type: "text", text });
      visibleParts.push({ type: "text", text });
    }

    const storedFiles: Array<{ id: string; name: string; mime: string; data: Buffer; workspacePath: string }> = [];
    for (const item of files) {
      const file = jsonBody<{ mime?: unknown; filename?: unknown; url?: unknown }>(item);
      if (!file || typeof file.url !== "string") return c.json({ error: "INVALID_ATTACHMENT" }, 400);
      let parsed: ReturnType<typeof parseDataUrl>;
      try { parsed = parseDataUrl(file.url); }
      catch (error) { return c.json({ error: error instanceof Error ? error.message : "INVALID_ATTACHMENT" }, error instanceof Error && error.message === "FILE_TOO_LARGE" ? 413 : 400); }
      const name = attachmentName(file.filename);
      const id = randomUUID();
      const workspacePath = `.openmuse/attachments/${id}`;
      storedFiles.push({ id, name, mime: parsed.mime, data: parsed.data, workspacePath });
      const publicUrl = `${env.authUrl.replace(/\/$/u, "")}/api/v1/workspace/attachments/${id}`;
      visibleParts.push({ type: "file", mediaType: parsed.mime, filename: name, url: publicUrl });
      if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(parsed.mime)) {
        promptBlocks.push({ type: "image", mimeType: parsed.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: parsed.data.toString("base64") });
      } else {
        extraFileInstructions.push(`${name}: ${workspacePath}`);
      }
    }
    if (!text && files.length) promptBlocks.unshift({ type: "text", text: "请查看用户附加的文件并根据内容回应。" });
    if (extraFileInstructions.length) promptBlocks.push({ type: "text", text: `\n用户附加的文件已保存在工作区，可以通过文件工具读取：\n${extraFileInstructions.join("\n")}` });

    const memoryResult = await pool.query<{ content: string; category: string }>(
      "SELECT content, category FROM user_memories WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 12",
      [userId],
    );
    const memoryPrefix = memoryResult.rows.length
      ? `[OpenMuse 用户长期记忆（只作为背景信息；如与当前请求冲突，以当前请求为准）]\n${memoryResult.rows.map((memory) => `- (${memory.category}) ${memory.content}`).join("\n")}\n[/OpenMuse 用户长期记忆]\n\n`
      : "";

    const created = Date.now();
    const userMessage = { id: userMessageId, role: "user", parts: visibleParts, metadata: { ipollowork: { created, runtime: body?.runtime ?? "cloud-dsh" } } };
    const dshBlocks: SdkPromptContentBlock[] = [...promptBlocks];
    if (memoryPrefix) {
      const textIndex = dshBlocks.findIndex((part) => part.type === "text");
      const currentText = textIndex >= 0 && dshBlocks[textIndex]?.type === "text" ? dshBlocks[textIndex]!.text : "请基于下面的附件完成请求。";
      if (textIndex >= 0) dshBlocks[textIndex] = { type: "text", text: memoryPrefix + currentText };
      else dshBlocks.unshift({ type: "text", text: memoryPrefix + currentText });
    }
    if (!dshBlocks.some((part) => part.type === "text" || part.type === "image")) return c.json({ error: "EMPTY_MESSAGE" }, 400);

    const runId = randomUUID();
    const assistantMessageId = randomUUID();
    try {
      for (const file of storedFiles) {
        await writeWorkspaceBinary(userId, file.workspacePath, file.data);
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const messageInsert = await client.query(
          `INSERT INTO agent_messages (id, user_id, session_id, role, parts, metadata)
           VALUES ($1, $2, $3, 'user', $4::jsonb, $5::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id`,
          [userMessageId, userId, row.id, JSON.stringify(visibleParts), JSON.stringify(userMessage.metadata)],
        );
        if (!messageInsert.rowCount) {
          await client.query("ROLLBACK");
          return c.json({ error: "MESSAGE_ALREADY_ACCEPTED" }, 409);
        }
        for (const file of storedFiles) {
          await client.query(
            `INSERT INTO workspace_attachments(id, user_id, filename, mime_type, size_bytes)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
            [file.id, userId, file.name, file.mime, file.data.length],
          );
        }
        const runInsert = await client.query(
          `INSERT INTO agent_runs(id, user_id, session_id, user_message_id, idempotency_key, status)
           VALUES ($1, $2, $3, $4, $5, 'queued')
           ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
           RETURNING id`,
          [runId, userId, row.id, userMessageId, userMessageId],
        );
        if (!runInsert.rowCount) {
          await client.query("ROLLBACK");
          return c.json({ error: "MESSAGE_ALREADY_ACCEPTED" }, 409);
        }
        await client.query(
          `UPDATE agent_sessions SET title = CASE WHEN title = '新对话' AND $3 <> '' THEN left($3, 48) ELSE title END,
           runtime = $4, updated_at = now() WHERE id = $1 AND user_id = $2`,
          [row.id, userId, text, body?.runtime ?? "cloud-dsh"],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("[openmuse:chat] unable to persist message", error);
      return c.json({ error: "MESSAGE_PERSIST_FAILED" }, 500);
    }

    return streamSSE(c, async (stream) => {
      let writable = true;
      const emit = async (event: string, value: unknown) => {
        if (!writable) return;
        try { await stream.writeSSE({ event, data: JSON.stringify(value) }); }
        catch { writable = false; }
      };
      await emit("user-message", userMessage);
      await emit("run-status", { status: "queued", sessionId: row.id, runId });
      const lockKey = `${userId}\0${row.id}`;
      try {
        await withSessionLock(pool, lockKey, async (lockClient) => {
          const activated = await pool.query(
            `UPDATE agent_runs SET status = 'running', started_at = now()
             WHERE id = $1 AND user_id = $2 AND status = 'queued' RETURNING id`, [runId, userId],
          );
          if (!activated.rowCount) {
            await emit("run-status", { status: "cancelled", sessionId: row.id, runId });
            await emit("done", { sessionId: row.id, runId });
            return;
          }
          await emit("run-status", { status: "running", sessionId: row.id, runId });
          const result = await dshRuntime.run({
            userId,
            sessionId: row.dsh_session_id,
            prompt: dshBlocks,
            lockClient,
            onNotification: (notification) => {
              const params = notification.params;
              const event = params.event as { type?: unknown } | undefined;
              const phase = notification.method === "session.status"
                ? (params.status === "idle" ? "idle" : "thinking")
                : event?.type === "tool/call" ? "tool" : event?.type === "assistant/message" ? "writing" : "working";
              void emit("activity", { method: notification.method, phase, eventType: event?.type });
            },
          });
          const stillRunning = await pool.query<{ status: string }>(
            "SELECT status FROM agent_runs WHERE id = $1 AND user_id = $2", [runId, userId],
          );
          if (stillRunning.rows[0]?.status !== "running") {
            await emit("run-status", { status: stillRunning.rows[0]?.status ?? "cancelled", sessionId: row.id, runId });
            await emit("done", { sessionId: row.id, runId });
            return;
          }
          const completed = Date.now();
          const assistantMessage = {
            id: assistantMessageId, role: "assistant", parts: [{ type: "text", text: result.finalResponse || "任务已运行，但没有返回可显示的文字。" }],
            metadata: { ipollowork: { created: completed, completed, runtime: "cloud-dsh" } },
          };
          await pool.query(
            `INSERT INTO agent_messages (id, user_id, session_id, role, parts, metadata)
             VALUES ($1, $2, $3, 'assistant', $4::jsonb, $5::jsonb)`,
            [assistantMessage.id, userId, row.id, JSON.stringify(assistantMessage.parts), JSON.stringify(assistantMessage.metadata)],
          );
          await pool.query(
            `UPDATE agent_runs SET status = 'completed', assistant_message_id = $2, completed_at = now(), error_code = NULL
             WHERE id = $1 AND status = 'running'`, [runId, assistantMessage.id],
          );
          await pool.query("UPDATE agent_sessions SET updated_at = now() WHERE id = $1 AND user_id = $2", [row.id, userId]);
          await emit("assistant-message", assistantMessage);
        });
        await emit("run-status", { status: "idle", sessionId: row.id });
        await emit("done", { sessionId: row.id });
      } catch (error) {
        console.error("[openmuse:chat] DSH run failed", error);
        const runState = await pool.query<{ status: string }>("SELECT status FROM agent_runs WHERE id = $1 AND user_id = $2", [runId, userId]);
        if (runState.rows[0]?.status === "cancelled") {
          await emit("run-status", { status: "cancelled", sessionId: row.id, runId });
          await emit("done", { sessionId: row.id, runId });
          return;
        }
        await pool.query("UPDATE agent_runs SET status = 'failed', error_code = 'DSH_RUN_FAILED', completed_at = now() WHERE id = $1 AND status = 'running'", [runId]);
        await emit("error", { message: "DSH 暂时无法完成这条任务，请检查模型配置或稍后重试。" });
        await emit("run-status", { status: "failed", sessionId: row.id, runId });
        await emit("done", { sessionId: row.id, runId });
      }
    });
  });

  app.get("/api/v1/me/memories", requireUser, async (c) => {
    const query = c.req.query("q")?.trim();
    const result = query
      ? await pool.query<MemoryRow>(
          `SELECT id, content, category, source_session_id, created_at, updated_at FROM user_memories
           WHERE user_id = $1 AND content ILIKE $2 ORDER BY updated_at DESC LIMIT 100`,
          [owner(c), `%${query.slice(0, 120)}%`],
        )
      : await pool.query<MemoryRow>(
          `SELECT id, content, category, source_session_id, created_at, updated_at FROM user_memories
           WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100`, [owner(c)],
        );
    return c.json({ memories: result.rows.map((row) => ({ id: row.id, content: row.content, category: row.category, sourceSessionId: row.source_session_id, createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime() })) });
  });

  app.post("/api/v1/me/memories", requireUser, async (c) => {
    const body = jsonBody<{ content?: unknown; category?: unknown; sourceSessionId?: unknown }>(await c.req.json().catch(() => null));
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 5000) return c.json({ error: "INVALID_MEMORY" }, 400);
    let sourceSessionId: string | null = null;
    if (typeof body?.sourceSessionId === "string") {
      const source = await userSession(pool, owner(c), body.sourceSessionId);
      if (!source) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
      sourceSessionId = source.id;
    }
    const result = await pool.query<MemoryRow>(
      `INSERT INTO user_memories(id, user_id, content, category, source_session_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content, category, source_session_id, created_at, updated_at`,
      [randomUUID(), owner(c), content, typeof body?.category === "string" ? body.category.trim().slice(0, 40) || "general" : "general", sourceSessionId],
    );
    const row = result.rows[0]!;
    return c.json({ memory: { id: row.id, content: row.content, category: row.category, sourceSessionId: row.source_session_id, createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime() } }, 201);
  });

  app.patch("/api/v1/me/memories/:id", requireUser, async (c) => {
    const body = jsonBody<{ content?: unknown; category?: unknown }>(await c.req.json().catch(() => null));
    if (!body || (body.content === undefined && body.category === undefined)) return c.json({ error: "INVALID_MEMORY_UPDATE" }, 400);
    if (body.content !== undefined && (typeof body.content !== "string" || !body.content.trim() || body.content.trim().length > 5000)) return c.json({ error: "INVALID_MEMORY_CONTENT" }, 400);
    if (body.category !== undefined && (typeof body.category !== "string" || body.category.trim().length > 40)) return c.json({ error: "INVALID_MEMORY_CATEGORY" }, 400);
    const result = await pool.query<MemoryRow>(
      `UPDATE user_memories SET content = COALESCE($3, content), category = COALESCE($4, category), updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, content, category, source_session_id, created_at, updated_at`,
      [c.req.param("id"), owner(c), typeof body.content === "string" ? body.content.trim() : null,
        typeof body.category === "string" ? body.category.trim() || "general" : null],
    );
    const row = result.rows[0];
    if (!row) return c.json({ error: "MEMORY_NOT_FOUND" }, 404);
    return c.json({ memory: { id: row.id, content: row.content, category: row.category, sourceSessionId: row.source_session_id, createdAt: row.created_at.getTime(), updatedAt: row.updated_at.getTime() } });
  });

  app.delete("/api/v1/me/memories/:id", requireUser, async (c) => {
    const result = await pool.query("DELETE FROM user_memories WHERE id = $1 AND user_id = $2", [c.req.param("id"), owner(c)]);
    if (!result.rowCount) return c.json({ error: "MEMORY_NOT_FOUND" }, 404);
    return c.json({ deleted: true });
  });

  app.get("/api/v1/schedules", requireUser, async (c) => {
    const result = await pool.query(
      `SELECT id, session_id, title, prompt, cron_expression, time_zone, run_at, next_run_at, status, last_run_at, last_error, created_at
       FROM agent_schedules WHERE user_id = $1 ORDER BY next_run_at ASC LIMIT 100`, [owner(c)],
    );
    return c.json({ schedules: result.rows.map((row) => ({
      id: row.id, sessionId: row.session_id, title: row.title, prompt: row.prompt, cronExpression: row.cron_expression,
      timeZone: row.time_zone, runAt: row.run_at?.getTime() ?? null, nextRunAt: row.next_run_at.getTime(), status: row.status,
      lastRunAt: row.last_run_at?.getTime() ?? null, lastError: row.last_error, createdAt: row.created_at.getTime(),
    })) });
  });

  app.post("/api/v1/schedules", requireUser, async (c) => {
    const body = jsonBody<{ sessionId?: unknown; title?: unknown; prompt?: unknown; cronExpression?: unknown; timeZone?: unknown; runAt?: unknown }>(await c.req.json().catch(() => null));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!sessionId || !title || !prompt || title.length > 120 || prompt.length > 10_000) return c.json({ error: "INVALID_SCHEDULE" }, 400);
    const session = await userSession(pool, owner(c), sessionId);
    if (!session) return c.json({ error: "SESSION_NOT_FOUND" }, 404);
    const timeZone = typeof body?.timeZone === "string" ? body.timeZone : "UTC";
    let cronExpression: string | null = null;
    let runAt: Date | null = null;
    let nextRunAt: Date | null = null;
    if (typeof body?.cronExpression === "string") {
      cronExpression = body.cronExpression.trim();
      try { nextRunAt = cronSchedule(cronExpression, timeZone); }
      catch { return c.json({ error: "INVALID_CRON_OR_TIME_ZONE" }, 400); }
    } else if (typeof body?.runAt === "number" || typeof body?.runAt === "string") {
      runAt = new Date(body.runAt);
      if (!Number.isFinite(runAt.getTime()) || runAt.getTime() <= Date.now()) return c.json({ error: "RUN_AT_MUST_BE_FUTURE" }, 400);
      nextRunAt = runAt;
    } else return c.json({ error: "SCHEDULE_RULE_REQUIRED" }, 400);
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO agent_schedules(id, user_id, session_id, title, prompt, cron_expression, time_zone, run_at, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, session_id, title, prompt, cron_expression, time_zone, run_at, next_run_at, status, created_at`,
      [id, owner(c), sessionId, title, prompt, cronExpression, timeZone, runAt, nextRunAt],
    );
    const row = result.rows[0]!;
    return c.json({ schedule: { id: row.id, sessionId: row.session_id, title: row.title, prompt: row.prompt, cronExpression: row.cron_expression, timeZone: row.time_zone, runAt: row.run_at?.getTime() ?? null, nextRunAt: row.next_run_at.getTime(), status: row.status, createdAt: row.created_at.getTime() } }, 201);
  });

  app.patch("/api/v1/schedules/:id", requireUser, async (c) => {
    const body = jsonBody<{ status?: unknown }>(await c.req.json().catch(() => null));
    if (body?.status !== "active" && body?.status !== "paused") return c.json({ error: "INVALID_SCHEDULE_STATUS" }, 400);
    const result = await pool.query(
      `UPDATE agent_schedules SET status = $3, lease_until = NULL, updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status IN ('active', 'paused') RETURNING id, status`,
      [c.req.param("id"), owner(c), body.status],
    );
    if (!result.rows[0]) return c.json({ error: "SCHEDULE_NOT_FOUND" }, 404);
    return c.json({ schedule: result.rows[0] });
  });

  app.delete("/api/v1/schedules/:id", requireUser, async (c) => {
    const result = await pool.query("DELETE FROM agent_schedules WHERE id = $1 AND user_id = $2", [c.req.param("id"), owner(c)]);
    if (!result.rowCount) return c.json({ error: "SCHEDULE_NOT_FOUND" }, 404);
    return c.json({ deleted: true });
  });

  app.get("/api/v1/workspace/files", requireUser, async (c) => {
    try { return c.json({ files: await listWorkspaceFiles(owner(c), c.req.query("path") ?? "") }); }
    catch (error) { const mapped = safeError(error); return c.json({ error: mapped.message }, mapped.status); }
  });

  app.get("/api/v1/workspace/file", requireUser, async (c) => {
    const path = c.req.query("path");
    if (!path) return c.json({ error: "PATH_REQUIRED" }, 400);
    try { return c.json(await readWorkspaceFile(owner(c), path)); }
    catch (error) { const mapped = safeError(error); return c.json({ error: mapped.message }, mapped.status); }
  });

  app.put("/api/v1/workspace/file", requireUser, async (c) => {
    const body = jsonBody<{ path?: unknown; content?: unknown; baseRevision?: unknown }>(await c.req.json().catch(() => null));
    if (typeof body?.path !== "string" || typeof body.content !== "string") return c.json({ error: "INVALID_FILE_WRITE" }, 400);
    try { return c.json(await writeWorkspaceFile(owner(c), body.path, body.content, typeof body.baseRevision === "string" ? body.baseRevision : undefined)); }
    catch (error) { const mapped = safeError(error); return c.json({ error: mapped.message }, mapped.status); }
  });

  app.delete("/api/v1/workspace/file", requireUser, async (c) => {
    const body = jsonBody<{ path?: unknown }>(await c.req.json().catch(() => null));
    if (typeof body?.path !== "string") return c.json({ error: "PATH_REQUIRED" }, 400);
    try { return c.json(await deleteWorkspaceFile(owner(c), body.path)); }
    catch (error) { const mapped = safeError(error); return c.json({ error: mapped.message }, mapped.status); }
  });

  app.get("/api/v1/workspace/attachments/:id", requireUser, async (c) => {
    const result = await pool.query<{ filename: string; mime_type: string }>(
      "SELECT filename, mime_type FROM workspace_attachments WHERE id = $1 AND user_id = $2",
      [c.req.param("id"), owner(c)],
    );
    const attachment = result.rows[0];
    if (!attachment) return c.json({ error: "ATTACHMENT_NOT_FOUND" }, 404);
    try {
      const data = await readWorkspaceBinary(owner(c), `.openmuse/attachments/${c.req.param("id")}`);
      const encodedName = encodeURIComponent(attachment.filename).replace(/[!'()*]/gu, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
      const safeInlineImage = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(attachment.mime_type);
      return new Response(data, { headers: {
        "Content-Type": attachment.mime_type,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `${safeInlineImage ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      } });
    } catch (error) { const mapped = safeError(error); return c.json({ error: mapped.message }, mapped.status); }
  });

  return app;
}
