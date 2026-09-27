import type { ChatMessage } from "@ipollowork/chat-client";
import type { UIMessage } from "ai";

type RecordValue = Record<string, unknown>;
const asRecord = (value: unknown): RecordValue => value && typeof value === "object" ? value as RecordValue : {};
const str = (value: unknown) => typeof value === "string" ? value : "";

/**
 * The transcript remains iPolloWork PC's AI SDK UIMessage. This is a one-way
 * display adapter for the copied Cloud chat rows, which currently render the
 * OpenCode-shaped `info + parts` view model.
 */
export function toCloudChatViewMessage(message: UIMessage, sessionId: string): ChatMessage {
  const meta = asRecord(message.metadata);
  const ipw = asRecord(meta.ipollowork);
  const createdAt = typeof ipw.created === "number" ? ipw.created : Date.now();
  const completedAt = typeof ipw.completed === "number" ? ipw.completed : undefined;
  const parts: RecordValue[] = [];
  message.parts.forEach((rawPart, index) => {
    const part = rawPart as unknown as RecordValue;
    const type = str(part.type);
    const id = str(part.id) || `${message.id}:part:${index}`;
    if (type === "text") { parts.push({ id, sessionID: sessionId, messageID: message.id, type, text: str(part.text) }); return; }
    if (type === "reasoning") { parts.push({ id, sessionID: sessionId, messageID: message.id, type, text: str(part.text), time: { start: createdAt, end: completedAt } }); return; }
    if (type === "file") return;
    if (type === "dynamic-tool" || type.startsWith("tool-")) {
      const tool = str(part.toolName) || (type.startsWith("tool-") ? type.slice(5) : "tool");
      const state = str(part.state);
      const status = state === "output-available" || state === "output-denied" ? "completed"
        : state === "output-error" ? "error"
          : state === "approval-requested" ? "pending" : "running";
      parts.push({
        id,
        sessionID: sessionId,
        messageID: message.id,
        type: "tool",
        callID: str(part.toolCallId) || id,
        tool,
        state: {
          status,
          input: asRecord(part.input),
          ...(part.output !== undefined ? { output: typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2) } : {}),
          ...(part.errorText ? { error: str(part.errorText) } : {}),
          ...(part.approval ? { metadata: asRecord(part.approval) } : {}),
        },
      });
    }
  });
  const info = {
    id: message.id,
    sessionID: sessionId,
    role: message.role === "user" ? "user" : "assistant",
    time: { created: createdAt, ...(completedAt ? { completed: completedAt } : {}) },
  };
  return { info, parts } as unknown as ChatMessage;
}

export function toCloudChatViewMessages(messages: UIMessage[], sessionId: string): ChatMessage[] {
  return messages.map((message) => toCloudChatViewMessage(message, sessionId));
}
