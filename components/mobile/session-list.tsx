"use client";

import { ChevronRight, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassPanel } from "@/components/future-lens/ds/glass-panel";
import type { ChatSession } from "@ipollowork/chat-client";

export function SessionList({ sessions, limit }: { sessions: ChatSession[]; limit?: number }) {
  const router = useRouter();
  const items = typeof limit === "number" ? sessions.slice(0, limit) : sessions;
  return (
    <GlassPanel intensity="subtle" className="divide-y divide-border/35 p-1.5">
      {items.map((session) => (
        <button key={session.id} type="button" onClick={() => router.push(`/chat/${session.id}`)} className="flex w-full items-center gap-3 px-2.5 py-2.5 text-left transition-colors hover:bg-muted/30 active:scale-[0.99]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"><MessageSquareText size={15} /></div>
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-foreground">{session.title || "Untitled"}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{session.id}</div></div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      ))}
    </GlassPanel>
  );
}
