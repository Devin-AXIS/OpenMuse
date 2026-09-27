"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { HeaderIconButton } from "@/components/future-lens/ds/header-icon-button";
import { AppPageShell } from "@/components/mobile/app-page-shell";
import { EmptyState } from "@/components/mobile/empty-state";
import { SessionList } from "@/components/mobile/session-list";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { translations } from "@/lib/future-lens/i18n";

export default function ChatPage() {
  const router = useRouter();
  const { language } = useAppConfig();
  const t = translations[language];
  const chat = useChatSessions();
  const create = async () => { const session = await chat.create(); router.push(session ? `/chat/${session.id}` : "/chat/new"); };
  return (
    <AppPageShell active="chat">
      <header className="flex items-center justify-between px-1 pb-5 pt-1"><h1 className="text-[20px] font-bold tracking-tight text-foreground">{t.chat_title}</h1><HeaderIconButton ariaLabel={t.new_session} onClick={() => void create()}><Plus size={20} /></HeaderIconButton></header>
      {chat.state === "ready" && chat.sessions.length ? <SessionList sessions={chat.sessions} /> : null}
      {chat.state === "ready" && !chat.sessions.length ? <EmptyState title={t.no_sessions} description={t.no_sessions_hint} /> : null}
      {chat.state === "loading" || chat.state === "preparing" ? <EmptyState title={t.worker_preparing} description={t.worker_preparing_hint} /> : null}
      {chat.state === "signed-out" ? <button type="button" onClick={() => router.push("/auth?next=/chat")} className="w-full"><EmptyState title={t.not_signed_in} description={t.signed_out_action} /></button> : null}
      {chat.state === "error" ? <button type="button" onClick={() => void chat.refresh()} className="w-full"><EmptyState title={t.worker_failed} description={t.worker_retry} /></button> : null}
    </AppPageShell>
  );
}
