"use client";

import type { ChatSession } from "@ipollowork/chat-client";
import { useCallback, useEffect, useState } from "react";

import { cloudBaseUrl } from "@/lib/cloud/config";

type State = "loading" | "signed-out" | "preparing" | "ready" | "error";
type ApiSession = ChatSession & { id: string; title: string; time: { created: number; updated: number; archived?: number | null } };

export function useChatSessions() {
  const [state, setState] = useState<State>("loading");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`${cloudBaseUrl}/api/v1/sessions`, { credentials: "include" });
      if (response.status === 401) { setState("signed-out"); return; }
      if (!response.ok) throw new Error(`Could not load conversations (${response.status}).`);
      const body = await response.json() as { sessions: ApiSession[] };
      setSessions(body.sessions ?? []);
      setError(null);
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load conversations.");
      setState("error");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = useCallback(async () => {
    const response = await fetch(`${cloudBaseUrl}/api/v1/sessions`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    if (response.status === 401) { setState("signed-out"); throw new Error("AUTH_REQUIRED"); }
    if (!response.ok) throw new Error(`Could not create a conversation (${response.status}).`);
    const body = await response.json() as { session: ApiSession };
    setSessions((current) => [body.session, ...current.filter((item) => item.id !== body.session.id)]);
    return body.session;
  }, []);

  return { state, sessions, error, refresh, create };
}
