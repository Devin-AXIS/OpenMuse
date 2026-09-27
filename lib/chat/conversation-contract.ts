import type { UIMessage, UIMessageChunk } from "ai";

/**
 * Mobile conversation contract aligned with iPolloWork PC's ConversationEngine.
 * Engine wire formats stay behind adapters; the UI reads AI SDK UIMessage data.
 */
export type ConversationStatus =
  | { type: "idle" }
  | { type: "busy" }
  | { type: "retry"; attempt: number; message: string; next: number };

export type ConversationSession = {
  [key: string]: unknown;
  id: string;
  title: string;
  slug?: string | null;
  parentID?: string | null;
  directory?: string | null;
  time?: { created?: number | null; updated?: number | null; archived?: number | null };
  revertMessageId?: string | null;
};

export type ConversationContextUsage = {
  usedTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  contextWindow?: number;
};

export type ConversationSnapshot = {
  session: ConversationSession;
  messages: UIMessage[];
  todos: ConversationTodo[];
  status: ConversationStatus;
  contextUsage?: ConversationContextUsage;
};

export type ConversationTodo = { id: string; content: string; status: string; priority: string };

export type ConversationPermission = {
  id: string;
  sessionId: string;
  kind: string;
  resources: string[];
  remember: string[];
  metadata: Record<string, unknown>;
  receivedAt: number;
  native: unknown;
};

export type ConversationQuestionOption = { label: string; description?: string };
export type ConversationQuestionInfo = { header?: string; question: string; options: ConversationQuestionOption[]; multiple?: boolean; custom?: boolean };
export type ConversationQuestion = { id: string; sessionId: string; questions: ConversationQuestionInfo[]; receivedAt: number; native: unknown };
export type ConversationAgent = { name: string; description?: string; hidden?: boolean; mode?: string };
export type ConversationModeIcon = "execute" | "plan" | "code" | "minimal" | "create";
export type ConversationMode = { id: string; label: string; description?: string; icon: ConversationModeIcon; isDefault?: boolean };
export type ConversationModeState = { id: string | null; mutable: boolean };
export type ConversationAccessModeIcon = "read-only" | "workspace" | "ask" | "full-access";
export type ConversationAccessMode = { id: string; label: string; description?: string; icon: ConversationAccessModeIcon; isDefault?: boolean; dangerous?: boolean; selectable?: boolean };
export type ConversationAccessModeState = { id: string | null; mutable: boolean };

export type ConversationPromptPart =
  | { type: "text"; text: string; synthetic?: boolean }
  | { type: "file"; mime: string; url: string; filename?: string }
  | { type: "agent"; name: string };
export type ConversationMessageChunk = Extract<UIMessageChunk, { type: "text-delta" | "reasoning-delta" }>;

export type ConversationEvent =
  | { type: "session.updated"; sessionId: string; info: Partial<ConversationSession> & Pick<ConversationSession, "id"> }
  | { type: "context.updated"; sessionId: string; usage: ConversationContextUsage }
  | { type: "session.deleted"; sessionId: string }
  | { type: "session.error"; sessionId: string; errorText: string; parentUserMessageId?: string }
  | { type: "session.compaction"; sessionId: string; running: boolean }
  | { type: "session.status"; sessionId: string; status: ConversationStatus }
  | { type: "session.idle"; sessionId: string }
  | { type: "todo.updated"; sessionId: string; todos: ConversationTodo[] }
  | { type: "permission.asked"; permission: ConversationPermission }
  | { type: "permission.replied"; sessionId: string; requestId: string }
  | { type: "question.asked"; question: ConversationQuestion }
  | { type: "question.replied"; sessionId: string; requestId: string }
  | { type: "message.upsert"; sessionId: string; message: UIMessage }
  | { type: "message.completed"; sessionId: string; messageId: string; completedAt: number; parentUserMessageId?: string }
  | { type: "message.removed"; sessionId: string; messageId: string }
  | { type: "message.parts"; sessionId: string; messageId: string; partId: string; parts: UIMessage["parts"]; messageRole?: UIMessage["role"]; parentUserMessageId?: string; visibleAssistantOutput: boolean }
  | { type: "message.chunk"; sessionId: string; messageId: string; parentUserMessageId?: string; chunk: ConversationMessageChunk };

export type ConversationSubscribeInput = { signal: AbortSignal; onEvent: (event: ConversationEvent) => void };
export type ConversationPromptInput = {
  sessionId: string;
  clientUserMessageId?: string;
  signal?: AbortSignal;
  parts: ConversationPromptPart[];
  model?: { providerID: string; modelID: string };
  mode?: string;
  variant?: string;
  reasoningEffort?: string;
  system?: string;
};
export type ConversationPromptResult = { sessionId: string };

/** Same engine boundary used by desktop: adapters normalize native engines to UIMessage + ConversationEvent. */
export interface ConversationEngineConnection {
  mapSnapshot(snapshot: unknown): ConversationSnapshot;
  modeState?(session: ConversationSession): ConversationModeState;
  accessModeState?(session: ConversationSession): ConversationAccessModeState;
  subscribe(input: ConversationSubscribeInput): Promise<void>;
  listPermissions(input: { sessionId: string; directory?: string }): Promise<ConversationPermission[]>;
  replyPermission(input: { permission: ConversationPermission; reply: "once" | "always" | "reject"; directory?: string }): Promise<void>;
  listQuestions(input: { sessionId: string; directory?: string }): Promise<ConversationQuestion[]>;
  replyQuestion(input: { question: ConversationQuestion; answers: string[][]; directory?: string }): Promise<void>;
  create(directory?: string): Promise<ConversationSession>;
  abort(sessionId: string, directory?: string): Promise<boolean>;
  revert(sessionId: string, messageId: string): Promise<ConversationSession>;
  fork(input: { sessionId: string; messageId: string | null; messages: UIMessage[] }): Promise<ConversationSession>;
  rename(sessionId: string, title: string, directory?: string): Promise<void>;
  setArchived(sessionId: string, archived: boolean, directory?: string): Promise<void>;
  shell(sessionId: string, command: string): Promise<void>;
  sendPrompt(input: ConversationPromptInput): Promise<ConversationPromptResult>;
  steerPrompt?(input: ConversationPromptInput): Promise<ConversationPromptResult>;
  listModes(): Promise<ConversationMode[]>;
  listAccessModes?(input: { sessionId: string; directory?: string }): Promise<ConversationAccessMode[]>;
  setAccessMode?(input: { sessionId: string; accessMode: string; directory?: string }): Promise<void>;
  listAgents(): Promise<ConversationAgent[]>;
}

export type ConversationEngineConnectInput = { baseUrl: string; token?: string; directory?: string; serverBaseUrl?: string; workspaceId?: string };
export interface ConversationEngineAdapter { readonly id: string; connect(input: ConversationEngineConnectInput): ConversationEngineConnection }

export class ConversationEngineAdapterRegistry {
  readonly #adapters: ReadonlyMap<string, ConversationEngineAdapter>;
  constructor(readonly defaultEngineId: string, adapters: readonly ConversationEngineAdapter[]) {
    const entries = new Map<string, ConversationEngineAdapter>();
    for (const adapter of adapters) {
      const id = adapter.id.trim();
      if (!id || entries.has(id)) throw new Error(`Invalid or duplicate conversation engine adapter: ${id || "<empty>"}`);
      entries.set(id, adapter);
    }
    this.#adapters = entries;
  }
  get(id?: string | null): ConversationEngineAdapter {
    const key = id?.trim() || this.defaultEngineId;
    const adapter = this.#adapters.get(key);
    if (!adapter) throw new Error(`Conversation engine is not registered: ${key}`);
    return adapter;
  }
  ids(): string[] { return [...this.#adapters.keys()]; }
}
