import {
  createOpencodeClient,
  type Event,
  type FileContent,
  type Message,
  type Part,
  type Session,
  type SessionStatus,
  type Todo,
} from "@opencode-ai/sdk/v2/client";

export { normalizeAgentUiEvent, type AgentUiActivity, type AgentUiEvent, type AgentUiPermission } from "./agent-ui";

export type ChatMessage = { info: Message; parts: Part[] };
export type ChatEvent = Event;
export type ChatFileContent = FileContent;
export type ChatEditableFile = { path: string; content: string; bytes: number; updatedAt: number; revision: string; version?: number; writable: boolean };
export type ChatEditableFileWrite = { path: string; content: string; baseUpdatedAt: number; baseRevision: string };
export type ChatEditableFileWriteResult = { ok: boolean; path: string; bytes: number; updatedAt: number; revision: string; version?: number };
export type ChatFileDownload = { url: string; filename: string; expiresAt: number };
export type ChatSession = Session;
export type ChatTodo = Todo;
export type ChatSessionStatus = SessionStatus;
export type ChatPermission = {
  id: string;
  sessionId: string;
  protocol: "legacy" | "v2";
  action: string;
  resources: string[];
};

export type ChatInput = {
  text: string;
  files?: Array<{ mime: string; filename?: string; url: string }>;
};

export interface ChatTransport {
  listSessions(): Promise<ChatSession[]>;
  createSession(input?: { title?: string }): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession>;
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  getTodos(sessionId: string): Promise<ChatTodo[]>;
  readFile(path: string): Promise<ChatFileContent>;
  createFileDownload(path: string): Promise<ChatFileDownload>;
  readEditableFile(path: string): Promise<ChatEditableFile>;
  writeEditableFile(input: ChatEditableFileWrite): Promise<ChatEditableFileWriteResult>;
  listPermissions(sessionId: string): Promise<ChatPermission[]>;
  replyPermission(permission: ChatPermission, reply: "once" | "always" | "reject"): Promise<void>;
  send(sessionId: string, input: ChatInput): Promise<void>;
  subscribe(signal: AbortSignal): Promise<AsyncIterable<ChatEvent>>;
  abort(sessionId: string): Promise<boolean>;
  rename(sessionId: string, title: string): Promise<void>;
  remove(sessionId: string): Promise<void>;
}

export class ChatFileError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = "ChatFileError";
  }
}

export type IPolloWorkChatTransportOptions = {
  baseUrl: string;
  accessToken: string;
  directory?: string;
  fetch?: typeof globalThis.fetch;
};

type ClientResult<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

function unwrap<T>(result: ClientResult<T>, operation: string): T {
  if (result.error !== undefined || result.data === undefined) {
    const status = result.response?.status;
    throw new Error(status ? `${operation} failed (${status})` : `${operation} failed`);
  }
  return result.data;
}

export class IPolloWorkChatTransport implements ChatTransport {
  readonly #directory?: string;
  readonly #client: ReturnType<typeof createOpencodeClient>;
  readonly #editableFileUrl: string;
  readonly #fileDownloadUrl: string;
  readonly #accessToken: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: IPolloWorkChatTransportOptions) {
    const baseUrl = options.baseUrl.trim().replace(/\/$/u, "");
    const accessToken = options.accessToken.trim();
    if (!baseUrl) throw new Error("iPolloWork baseUrl is required");
    if (!accessToken) throw new Error("iPolloWork access token is required");
    this.#directory = options.directory;
    const workerBaseUrl = baseUrl.replace(/\/opencode$/u, "");
    this.#editableFileUrl = `${workerBaseUrl}/ipollowork/files/content`;
    this.#fileDownloadUrl = `${workerBaseUrl}/ipollowork/files/download`;
    this.#accessToken = accessToken;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#client = createOpencodeClient({
      baseUrl,
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: options.fetch,
      throwOnError: false,
    });
  }

  async listSessions(): Promise<ChatSession[]> {
    return unwrap(await this.#client.session.list({ directory: this.#directory, limit: 100 }), "list sessions");
  }

  async createSession(input?: { title?: string }): Promise<ChatSession> {
    return unwrap(await this.#client.session.create({ directory: this.#directory, title: input?.title }), "create session");
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    return unwrap(await this.#client.session.get({ directory: this.#directory, sessionID: sessionId }), "get session");
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return unwrap(await this.#client.session.messages({ directory: this.#directory, sessionID: sessionId, limit: 200 }), "get messages");
  }

  async getTodos(sessionId: string): Promise<ChatTodo[]> {
    return unwrap(await this.#client.session.todo({ directory: this.#directory, sessionID: sessionId }), "get todos");
  }

  async readFile(path: string): Promise<ChatFileContent> {
    return unwrap(await this.#client.file.read({ directory: this.#directory, path }), "read file");
  }

  async createFileDownload(path: string): Promise<ChatFileDownload> {
    const ticket = await this.#fileRequest<ChatFileDownload>(this.#fileDownloadUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return { ...ticket, url: new URL(ticket.url, this.#fileDownloadUrl).toString() };
  }

  async readEditableFile(path: string): Promise<ChatEditableFile> {
    const candidates = [path];
    const normalized = path.replace(/\\/gu, "/");
    const workspaceIndex = normalized.lastIndexOf("/workspace/");
    if (workspaceIndex >= 0) candidates.push(normalized.slice(workspaceIndex + "/workspace/".length));
    let failure: unknown;
    for (const candidate of [...new Set(candidates)]) {
      try {
        return await this.#fileRequest<ChatEditableFile>(`${this.#editableFileUrl}?path=${encodeURIComponent(candidate)}`, { method: "GET" });
      } catch (error) {
        failure = error;
        if (!(error instanceof ChatFileError) || ![400, 404].includes(error.status)) throw error;
      }
    }
    throw failure;
  }

  async writeEditableFile(input: ChatEditableFileWrite): Promise<ChatEditableFileWriteResult> {
    return this.#fileRequest<ChatEditableFileWriteResult>(`${this.#editableFileUrl}?path=${encodeURIComponent(input.path)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: input.content, baseUpdatedAt: input.baseUpdatedAt, baseRevision: input.baseRevision }),
    });
  }

  async #fileRequest<T>(url: string, init: RequestInit): Promise<T> {
    const response = await this.#fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${this.#accessToken}` } });
    const body = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok || !body) throw new ChatFileError(body?.error ?? `EDITABLE_FILE_${response.status}`, response.status);
    return body;
  }

  async listPermissions(sessionId: string): Promise<ChatPermission[]> {
    const permissions: ChatPermission[] = [];
    try {
      const legacy = unwrap(await this.#client.permission.list({ directory: this.#directory }), "list legacy permissions");
      permissions.push(...legacy.filter((item) => item.sessionID === sessionId).map((item) => ({ id: item.id, sessionId: item.sessionID, protocol: "legacy" as const, action: item.permission, resources: item.patterns })));
    } catch {
      // OpenCode versions can expose legacy and v2 permission APIs independently.
    }
    try {
      const response = unwrap(await this.#client.v2.session.permission.list({ sessionID: sessionId }), "list v2 permissions");
      permissions.push(...response.data.map((item) => ({ id: item.id, sessionId: item.sessionID, protocol: "v2" as const, action: item.action, resources: item.resources })));
    } catch {
      // Keep the legacy snapshot when the v2 endpoint is unavailable.
    }
    return Array.from(new Map(permissions.map((item) => [item.id, item])).values());
  }

  async replyPermission(permission: ChatPermission, reply: "once" | "always" | "reject"): Promise<void> {
    if (permission.protocol === "v2") {
      unwrap(await this.#client.v2.session.permission.reply({ sessionID: permission.sessionId, requestID: permission.id, reply }), "reply v2 permission");
      return;
    }
    unwrap(await this.#client.permission.reply({ requestID: permission.id, directory: this.#directory, reply }), "reply permission");
  }

  async send(sessionId: string, input: ChatInput): Promise<void> {
    const text = input.text.trim();
    const parts = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...(input.files ?? []).map((file) => ({ type: "file" as const, ...file })),
    ];
    if (!parts.length) throw new Error("Chat input is empty");
    unwrap(await this.#client.session.promptAsync({ directory: this.#directory, sessionID: sessionId, parts }), "send message");
  }

  async subscribe(signal: AbortSignal): Promise<AsyncIterable<ChatEvent>> {
    const subscription = await this.#client.event.subscribe(undefined, { signal });
    if (!subscription.stream) throw new Error("subscribe events failed");
    return subscription.stream as AsyncIterable<ChatEvent>;
  }

  async abort(sessionId: string): Promise<boolean> {
    return unwrap(await this.#client.session.abort({ directory: this.#directory, sessionID: sessionId }), "abort session");
  }

  async rename(sessionId: string, title: string): Promise<void> {
    unwrap(await this.#client.session.update({ directory: this.#directory, sessionID: sessionId, title: title.trim() }), "rename session");
  }

  async remove(sessionId: string): Promise<void> {
    unwrap(await this.#client.session.delete({ directory: this.#directory, sessionID: sessionId }), "delete session");
  }
}
