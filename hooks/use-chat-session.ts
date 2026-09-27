"use client";

import type {
  AgentUiActivity,
  ChatEditableFile,
  ChatEditableFileWriteResult,
  ChatFileContent,
  ChatInput,
  ChatMessage,
  ChatPermission,
} from "@ipollowork/chat-client";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConversationSession, ConversationStatus, ConversationTodo } from "@/lib/chat/conversation-contract";
import { toCloudChatViewMessages } from "@/lib/chat/conversation-view-adapter";
import { cloudBaseUrl } from "@/lib/cloud/config";

type ChatState = "loading" | "signed-out" | "preparing" | "ready" | "error";
type DemoRuntime = "cloud-dsh" | "ipollowork-pc";
type StoredMessage = { id: string; role: UIMessage["role"]; parts: UIMessage["parts"]; metadata?: UIMessage["metadata"] };

function messageFromApi(value: StoredMessage): UIMessage {
  return { id: value.id, role: value.role, parts: value.parts, ...(value.metadata ? { metadata: value.metadata } : {}) } as UIMessage;
}

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
  if (response.status === 401) return "AUTH_REQUIRED";
  return body.message ?? body.error ?? `Request failed (${response.status})`;
}

export function useChatSession(requestedSessionId?: string, runtime: DemoRuntime = "cloud-dsh") {
  const [state, setState] = useState<ChatState>("loading");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [todos] = useState<ConversationTodo[]>([]);
  const [permissions, setPermissions] = useState<ChatPermission[]>([]);
  const [status, setStatus] = useState<ConversationStatus>({ type: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [permissionReplyId, setPermissionReplyId] = useState<string | null>(null);
  const [activity, setActivity] = useState<AgentUiActivity | null>(null);
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setState("loading");
    setSession(null);
    setMessages([]);
    setActiveSessionId("");
    setError(null);

    void (async () => {
      let id = requestedSessionId && requestedSessionId !== "new" ? requestedSessionId : crypto.randomUUID();
      let response = requestedSessionId && requestedSessionId !== "new"
        ? await fetch(`${cloudBaseUrl}/api/v1/sessions/${encodeURIComponent(id)}`, { credentials: "include", signal: abort.signal })
        : await fetch(`${cloudBaseUrl}/api/v1/sessions`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), signal: abort.signal,
          });

      if (response.status === 404 && requestedSessionId && requestedSessionId !== "new") {
        response = await fetch(`${cloudBaseUrl}/api/v1/sessions`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), signal: abort.signal,
        });
      }
      if (response.status === 401) { if (active) setState("signed-out"); return; }
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json() as { session?: ConversationSession; messages?: StoredMessage[] };
      if (!body.session) throw new Error("Session response was empty.");
      if (active) {
        setActiveSessionId(id);
        setSession(body.session);
        setMessages((body.messages ?? []).map(messageFromApi));
        setState("ready");
      }
    })().catch((cause: unknown) => {
      if (!active || abort.signal.aborted) return;
      setState("error");
      setError(cause instanceof Error ? cause.message : "Unable to load this conversation.");
    });

    return () => { active = false; abort.abort(); };
  }, [requestedSessionId]);

  useEffect(() => () => { streamAbortRef.current?.abort(); }, []);

  const viewMessages = useMemo(() => toCloudChatViewMessages(messages, activeSessionId || session?.id || "new"), [messages, activeSessionId, session?.id]);

  const consumeStream = useCallback(async (response: Response, runId: number) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The server returned an empty event stream.");
    const decoder = new TextDecoder();
    let buffer = "";
    let ended = false;

    const handleBlock = (block: string) => {
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      const value = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      if (eventName === "activity") {
        const phase = value.phase === "tool" ? "tool" : value.phase === "writing" ? "writing" : value.phase === "thinking" ? "thinking" : "working";
        setActivity({ sessionId: activeSessionId, phase, state: "started", messageId: activeAssistantMessageId ?? undefined } as AgentUiActivity);
      } else if (eventName === "assistant-message") {
        setMessages((current) => [...current, messageFromApi(value as unknown as StoredMessage)]);
      } else if (eventName === "run-status" && value.status === "idle") {
        setActivity({ sessionId: activeSessionId, phase: "writing", state: "ended", messageId: activeAssistantMessageId ?? undefined } as AgentUiActivity);
      } else if (eventName === "error") {
        setError(typeof value.message === "string" ? value.message : "The agent run failed.");
      } else if (eventName === "done") {
        ended = true;
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r\n/gu, "\n");
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          try { handleBlock(block); } catch (cause) { console.error("[openmuse:sse] invalid event", cause); }
          boundary = buffer.indexOf("\n\n");
        }
        if (done) break;
      }
      if (buffer.trim()) handleBlock(buffer);
      if (runId === runIdRef.current) {
        setStatus({ type: "idle" });
        setActiveAssistantMessageId(null);
        if (ended) setActivity((current) => current ? { ...current, state: "ended" } : null);
      }
    } finally {
      reader.releaseLock();
    }
  }, [activeAssistantMessageId, activeSessionId]);

  const send = useCallback(async (input: ChatInput) => {
    const text = input.text.trim();
    const id = activeSessionId;
    if ((!text && !input.files?.length) || !id || status.type === "busy") return false;
    if (runtime === "ipollowork-pc") {
      setError("iPolloWork PC 尚未连接到 OpenMuse 服务。请先完成真实配对后再切换。");
      return false;
    }
    const now = Date.now();
    const userMessageId = crypto.randomUUID();
    const userMessage: UIMessage = {
      id: userMessageId,
      role: "user",
      parts: [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...(input.files ?? []).map((file) => ({ type: "file" as const, mediaType: file.mime, url: file.url, filename: file.filename ?? "attachment" })),
      ],
      metadata: { ipollowork: { created: now, runtime } },
    };
    const assistantId = `assistant-${crypto.randomUUID()}`;
    setMessages((current) => [...current, userMessage]);
    setSession((current) => current ? { ...current, title: current.title === "新对话" ? (text.slice(0, 36) || "附件对话") : current.title, time: { ...current.time, updated: now } } : current);
    setStatus({ type: "busy" });
    setActiveAssistantMessageId(assistantId);
    setActivity({ sessionId: id, phase: "thinking", state: "started", messageId: assistantId });
    setError(null);
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    streamAbortRef.current?.abort();
    streamAbortRef.current = controller;

    let response: Response;
    try {
      response = await fetch(`${cloudBaseUrl}/api/v1/sessions/${encodeURIComponent(id)}/messages`, {
        method: "POST", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ text, files: input.files ?? [], clientUserMessageId: userMessageId, runtime }),
      });
    } catch (cause) {
      if (controller.signal.aborted) return false;
      setStatus({ type: "idle" }); setActiveAssistantMessageId(null); setActivity(null);
      setError(cause instanceof Error ? cause.message : "Unable to reach OpenMuse Cloud.");
      return false;
    }

    if (response.status === 401) {
      setState("signed-out"); setStatus({ type: "idle" }); setActiveAssistantMessageId(null); return false;
    }
    if (!response.ok) {
      setStatus({ type: "idle" }); setActiveAssistantMessageId(null); setActivity(null);
      setError(await errorMessage(response));
      return false;
    }
    void consumeStream(response, runId).catch((cause: unknown) => {
      if (controller.signal.aborted || runId !== runIdRef.current) return;
      setStatus({ type: "idle" }); setActiveAssistantMessageId(null); setActivity(null);
      setError(cause instanceof Error ? cause.message : "The conversation stream ended unexpectedly.");
    });
    return true;
  }, [activeSessionId, consumeStream, runtime, status.type]);

  const stop = useCallback(async () => {
    runIdRef.current += 1;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStatus({ type: "idle" }); setActiveAssistantMessageId(null); setActivity(null);
    if (activeSessionId) {
      await fetch(`${cloudBaseUrl}/api/v1/sessions/${encodeURIComponent(activeSessionId)}/stop`, { method: "POST", credentials: "include" }).catch(() => undefined);
    }
  }, [activeSessionId]);

  const replyPermission = useCallback(async (permission: ChatPermission, _reply: "once" | "always" | "reject") => {
    setPermissionReplyId(permission.id);
    setPermissions((current) => current.filter((item) => item.id !== permission.id));
    setPermissionReplyId(null);
  }, []);

  const readEditableArtifact = useCallback(async (path: string) => {
    const response = await fetch(`${cloudBaseUrl}/api/v1/workspace/file?path=${encodeURIComponent(path)}`, { credentials: "include" });
    if (response.status === 401) throw new Error("AUTH_REQUIRED");
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json() as Promise<ChatEditableFile>;
  }, []);

  const readArtifact = useCallback(async (path: string) => {
    const response = await fetch(`${cloudBaseUrl}/api/v1/workspace/file?path=${encodeURIComponent(path)}`, { credentials: "include" });
    if (!response.ok) throw new Error(await errorMessage(response));
    const body = await response.json() as { content: string };
    return { type: "text", content: body.content } as ChatFileContent;
  }, []);

  const downloadArtifact = useCallback(async (path: string) => {
    const response = await fetch(`${cloudBaseUrl}/api/v1/workspace/file?path=${encodeURIComponent(path)}`, { credentials: "include" });
    if (!response.ok) throw new Error(await errorMessage(response));
    const body = await response.json() as { content: string; path: string };
    const url = URL.createObjectURL(new Blob([body.content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = body.path.split("/").pop() || "file"; anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const writeEditableArtifact = useCallback(async (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => {
    const response = await fetch(`${cloudBaseUrl}/api/v1/workspace/file`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: input.path, content: input.content, baseRevision: input.baseRevision }),
    });
    if (response.status === 401) throw new Error("AUTH_REQUIRED");
    if (response.status === 409) return { ok: false, path: input.path, bytes: 0, updatedAt: Date.now(), revision: input.baseRevision } as ChatEditableFileWriteResult;
    if (!response.ok) throw new Error(await errorMessage(response));
    const result = await response.json() as Omit<ChatEditableFileWriteResult, "ok">;
    return { ...result, ok: true };
  }, []);

  return {
    state, session, messages: viewMessages as ChatMessage[], canonicalMessages: messages,
    todos, permissions, status, error, permissionReplyId, activity, activeAssistantMessageId,
    send, stop, replyPermission, readArtifact, downloadArtifact, readEditableArtifact, writeEditableArtifact,
  };
}
