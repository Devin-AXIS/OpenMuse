import type { Event as OpenCodeEvent, Message, Part, Session, SessionStatus, Todo } from "@opencode-ai/sdk/v2/client";

/**
 * Stable client-side event vocabulary for an agent conversation.
 *
 * OpenCode remains the only live transport today. Keeping this adapter at the
 * package boundary means another compliant runtime can be added later without
 * making the App's rendering state depend on its wire event names.
 */
export type AgentUiActivity = {
  sessionId: string;
  phase: "thinking" | "writing" | "tool" | "working" | "retry";
  state: "started" | "updated" | "ended" | "failed";
  messageId?: string;
  callId?: string;
};

export type AgentUiPermission = {
  id: string;
  sessionId: string;
  protocol: "legacy" | "v2";
  action: string;
  resources: string[];
};

export type AgentUiEvent =
  | { kind: "session.updated"; sessionId: string; session: Session }
  | { kind: "message.updated"; sessionId: string; message: Message }
  | { kind: "message.removed"; sessionId: string; messageId: string }
  | { kind: "part.updated"; sessionId: string; part: Part }
  | { kind: "part.delta"; sessionId: string; messageId: string; partId: string; delta: string }
  | { kind: "part.removed"; sessionId: string; messageId: string; partId: string }
  | { kind: "todo.updated"; sessionId: string; todos: Todo[] }
  | { kind: "permission.asked"; permission: AgentUiPermission }
  | { kind: "permission.replied"; sessionId: string; requestId: string }
  | { kind: "run.status"; sessionId: string; status: SessionStatus }
  | { kind: "run.idle"; sessionId: string }
  | { kind: "run.error"; sessionId?: string; message: string }
  | { kind: "activity"; activity: AgentUiActivity }
  | { kind: "raw"; sessionId?: string; raw: OpenCodeEvent };

type EventProperties = Record<string, unknown>;

function propertiesOf(event: OpenCodeEvent): EventProperties {
  return event.properties as EventProperties;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sessionIdOf(event: OpenCodeEvent): string | undefined {
  const properties = propertiesOf(event);
  const direct = stringValue(properties.sessionID);
  if (direct) return direct;
  const part = properties.part;
  if (part && typeof part === "object") return stringValue((part as { sessionID?: unknown }).sessionID);
  const info = properties.info;
  if (info && typeof info === "object") return stringValue((info as { sessionID?: unknown }).sessionID);
  return undefined;
}

function eventErrorMessage(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return "SESSION_ERROR";
}

function activityFor(event: OpenCodeEvent): AgentUiActivity | null {
  const sessionId = sessionIdOf(event);
  if (!sessionId) return null;
  const type = event.type;
  const properties = propertiesOf(event);
  const messageId = stringValue(properties.assistantMessageID) ?? stringValue(properties.messageID);
  const callId = stringValue(properties.callID);
  const state = type.endsWith("failed")
    ? "failed"
    : type.endsWith("ended") || type.endsWith("success")
      ? "ended"
      : type.endsWith("started") || type.endsWith("called")
        ? "started"
        : "updated";

  if (type.includes("reasoning")) return { sessionId, phase: "thinking", state, messageId };
  if (type.includes("text")) return { sessionId, phase: "writing", state, messageId };
  if (type.includes("tool") || type.includes("shell")) return { sessionId, phase: "tool", state, messageId, callId };
  if (type.includes("step") || type.includes("compaction")) return { sessionId, phase: "working", state, messageId };
  if (type.includes("retried")) return { sessionId, phase: "retry", state, messageId };
  return null;
}

/** Maps native OpenCode SSE events to the App's protocol-neutral UI events. */
export function normalizeAgentUiEvent(event: OpenCodeEvent): AgentUiEvent {
  const properties = propertiesOf(event);
  switch (event.type) {
    case "session.updated": {
      const session = properties.info as Session;
      return { kind: "session.updated", sessionId: session.id, session };
    }
    case "message.updated": {
      const message = properties.info as Message;
      return { kind: "message.updated", sessionId: sessionIdOf(event) ?? message.sessionID, message };
    }
    case "message.removed":
      return { kind: "message.removed", sessionId: sessionIdOf(event) ?? "", messageId: String(properties.messageID ?? "") };
    case "message.part.updated": {
      const part = properties.part as Part;
      return { kind: "part.updated", sessionId: sessionIdOf(event) ?? part.sessionID, part };
    }
    case "message.part.delta":
      return {
        kind: "part.delta",
        sessionId: sessionIdOf(event) ?? "",
        messageId: String(properties.messageID ?? ""),
        partId: String(properties.partID ?? ""),
        delta: String(properties.delta ?? ""),
      };
    case "message.part.removed":
      return {
        kind: "part.removed",
        sessionId: sessionIdOf(event) ?? "",
        messageId: String(properties.messageID ?? ""),
        partId: String(properties.partID ?? ""),
      };
    case "todo.updated":
      return { kind: "todo.updated", sessionId: sessionIdOf(event) ?? "", todos: properties.todos as Todo[] };
    case "permission.asked":
      return {
        kind: "permission.asked",
        permission: {
          id: String(properties.id ?? ""),
          sessionId: sessionIdOf(event) ?? "",
          protocol: "legacy",
          action: String(properties.permission ?? ""),
          resources: stringArray(properties.patterns),
        },
      };
    case "permission.v2.asked":
      return {
        kind: "permission.asked",
        permission: {
          id: String(properties.id ?? ""),
          sessionId: sessionIdOf(event) ?? "",
          protocol: "v2",
          action: String(properties.action ?? ""),
          resources: stringArray(properties.resources),
        },
      };
    case "permission.replied":
    case "permission.v2.replied":
      return { kind: "permission.replied", sessionId: sessionIdOf(event) ?? "", requestId: String(properties.requestID ?? "") };
    case "session.status":
      return { kind: "run.status", sessionId: sessionIdOf(event) ?? "", status: properties.status as SessionStatus };
    case "session.idle":
      return { kind: "run.idle", sessionId: sessionIdOf(event) ?? "" };
    case "session.error":
      return { kind: "run.error", sessionId: sessionIdOf(event), message: eventErrorMessage(properties.error) };
  }

  const activity = activityFor(event);
  return activity ? { kind: "activity", activity } : { kind: "raw", sessionId: sessionIdOf(event), raw: event };
}
