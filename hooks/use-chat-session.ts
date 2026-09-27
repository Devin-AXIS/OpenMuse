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

type ChatState = "loading" | "signed-out" | "preparing" | "ready" | "error";
type DemoRuntime = "cloud-dsh" | "ipollowork-pc";

const transcriptStore = new Map<string, UIMessage[]>();
const timerStore = new Map<string, number>();

function responseFor(text: string) {
  if (/运动|习惯|目标|计划/u.test(text)) {
    return "好，我们先把它拆成容易开始的小步。\n\n• 选一个本周能做到的最小行动\n• 找一个不容易被打断的时间\n• 周末一起回顾进度，再调整下一周\n\n你也可以继续补充偏好，我会把计划改得更适合你。";
  }
  if (/整理|总结|安排/u.test(text)) {
    return "我先帮你把重点理清楚，再按优先级排好。你可以继续补充背景；涉及外部操作或需要授权的动作，我会先征求你的确认。";
  }
  return "收到。我会记住这段对话的重要背景，并和你一起把事情往前推进。你可以随时打断、补充要求，或者让我先列一个计划。";
}

export function useChatSession(requestedSessionId?: string, runtime: DemoRuntime = "cloud-dsh") {
  const sessionId = requestedSessionId && requestedSessionId !== "new" ? requestedSessionId : "openmuse-main";
  const [state, setState] = useState<ChatState>("loading");
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [todos, setTodos] = useState<ConversationTodo[]>([]);
  const [permissions, setPermissions] = useState<ChatPermission[]>([]);
  const [status, setStatus] = useState<ConversationStatus>({ type: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [permissionReplyId, setPermissionReplyId] = useState<string | null>(null);
  const [activity, setActivity] = useState<AgentUiActivity | null>(null);
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    setSession({ id: sessionId, title: "新对话", time: { created: Date.now(), updated: Date.now() } });
    setMessages(transcriptStore.get(sessionId) ?? []);
    setState("ready");
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    transcriptStore.set(sessionId, messages);
  }, [messages, sessionId]);

  const viewMessages = useMemo(() => toCloudChatViewMessages(messages, sessionId), [messages, sessionId]);

  const send = useCallback(async (input: ChatInput) => {
    const text = input.text.trim();
    if (!text && !input.files?.length || status.type === "busy") return false;
    const now = Date.now();
    const userMessage: UIMessage = {
      id: `user-${now}`,
      role: "user",
      parts: [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...(input.files ?? []).map((file) => ({ type: "file" as const, mediaType: file.mime, url: file.url, filename: file.filename ?? "attachment" })),
      ],
      metadata: { ipollowork: { created: now, runtime } },
    };
    const assistantId = `assistant-${now}`;
    setMessages((current) => [...current, userMessage]);
    setSession((current) => current ? { ...current, title: current.title === "新对话" ? (text.slice(0, 36) || "图片对话") : current.title, time: { ...current.time, updated: now } } : current);
    setStatus({ type: "busy" });
    setActiveAssistantMessageId(assistantId);
    setActivity({ sessionId, phase: "thinking", state: "started", messageId: assistantId });
    setError(null);
    const runId = ++runIdRef.current;
    timerRef.current = window.setTimeout(() => {
      if (runId !== runIdRef.current) return;
      const completed = Date.now();
      const reply = responseFor(text || "请看看这张图片");
      const assistantMessage: UIMessage = {
        id: assistantId,
        role: "assistant",
        parts: [{ type: "text", text: reply }],
        metadata: { ipollowork: { created: now, completed, runtime } },
      };
      setMessages((current) => [...current, assistantMessage]);
      if (/目标|计划|运动/u.test(text)) {
        setTodos([
          { id: `${runId}-1`, content: "确定这周能开始的最小行动", status: "completed", priority: "high" },
          { id: `${runId}-2`, content: "安排一个合适的时间", status: "in_progress", priority: "high" },
          { id: `${runId}-3`, content: "周末回顾并调整计划", status: "pending", priority: "normal" },
        ]);
      }
      setActivity({ sessionId, phase: "writing", state: "ended", messageId: assistantId });
      setStatus({ type: "idle" });
      setActiveAssistantMessageId(null);
      timerRef.current = null;
    }, 760);
    return true;
  }, [runtime, sessionId, status.type]);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setStatus({ type: "idle" });
    setActiveAssistantMessageId(null);
    setActivity(null);
  }, []);

  const replyPermission = useCallback(async (permission: ChatPermission, _reply: "once" | "always" | "reject") => {
    setPermissionReplyId(permission.id);
    setPermissions((current) => current.filter((item) => item.id !== permission.id));
    setPermissionReplyId(null);
  }, []);

  const readArtifact = useCallback(async (_path: string) => ({ type: "text", content: "" }) as ChatFileContent, []);
  const downloadArtifact = useCallback(async (_path: string) => undefined, []);
  const readEditableArtifact = useCallback(async (path: string) => ({ path, content: "", bytes: 0, updatedAt: Date.now(), revision: "demo", writable: false }) as ChatEditableFile, []);
  const writeEditableArtifact = useCallback(async (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => ({ ok: false, path: input.path, bytes: 0, updatedAt: Date.now(), revision: input.baseRevision }) as ChatEditableFileWriteResult, []);

  return {
    state, session, messages: viewMessages as ChatMessage[], canonicalMessages: messages,
    todos, permissions, status, error, permissionReplyId, activity, activeAssistantMessageId,
    send, stop, replyPermission, readArtifact, downloadArtifact, readEditableArtifact, writeEditableArtifact,
  };
}
