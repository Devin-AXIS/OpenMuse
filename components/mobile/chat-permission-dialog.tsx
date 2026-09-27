import type { ChatPermission } from "@ipollowork/chat-client";
import { Check } from "lucide-react";
import { memo } from "react";

import { ModalDialog } from "@/components/future-lens/ds/modal-dialog";
import { PillButton } from "@/components/future-lens/ds/pill-button";
import type { Language } from "@/lib/future-lens/i18n";
import { translations } from "@/lib/future-lens/i18n";

export const ChatPermissionDialog = memo(function ChatPermissionDialog({ permission, language, busy, onReply }: { permission: ChatPermission | null; language: Language; busy: boolean; onReply: (reply: "once" | "always" | "reject") => void }) {
  const t = translations[language];
  return (
    <ModalDialog isOpen={permission != null} onClose={() => { if (!busy) onReply("reject"); }} variant="action-sheet" level="OVERLAY">
      {permission ? <div className="flex flex-col gap-4 pt-1 pb-2"><div className="flex items-start gap-3 px-1"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={18} /></div><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-foreground">{t.permission_title}</h3><p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t.permission_hint}</p></div></div><div className="rounded-2xl border border-border/50 bg-secondary/30 p-3"><div className="text-[12px] font-medium text-foreground">{permission.action}</div>{permission.resources.length ? <div className="mt-1 break-all text-[10px] leading-relaxed text-muted-foreground">{permission.resources.join(" · ")}</div> : null}</div><div className="space-y-2"><PillButton disabled={busy} onClick={() => onReply("once")}>{t.permission_once}</PillButton><PillButton disabled={busy} variant="secondary" onClick={() => onReply("always")}>{t.permission_always}</PillButton><button type="button" disabled={busy} onClick={() => onReply("reject")} className="w-full py-2 text-[12px] font-medium text-destructive disabled:opacity-50">{t.permission_reject}</button></div></div> : null}
    </ModalDialog>
  );
});
