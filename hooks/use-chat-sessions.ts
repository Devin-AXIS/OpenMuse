"use client";

import type { ChatSession } from "@ipollowork/chat-client";
import { useCallback, useEffect, useState } from "react";

type State = "loading" | "signed-out" | "preparing" | "ready" | "error";

const sampleSessions = [
  { id: "plan-week", title: "整理这周的安排", time: { created: Date.now() - 86_400_000, updated: Date.now() - 86_400_000 } },
  { id: "hiking", title: "周末徒步路线", time: { created: Date.now() - 172_800_000, updated: Date.now() - 172_800_000 } },
] as ChatSession[];

export function useChatSessions() {
  const [state, setState] = useState<State>("loading");
  const [sessions, setSessions] = useState<ChatSession[]>(sampleSessions);
  const [error] = useState<string | null>(null);
  useEffect(() => setState("ready"), []);

  const refresh = useCallback(async () => setState("ready"), []);
  const create = useCallback(async () => {
    const now = Date.now();
    const session = { id: `openmuse-${now}`, title: "新对话", time: { created: now, updated: now } } as ChatSession;
    setSessions((current) => [session, ...current]);
    return session;
  }, []);
  return { state, sessions, error, refresh, create };
}
