"use client";

import { Brain, Check, ChevronRight, Loader2 } from "lucide-react";
import { memo, useState } from "react";

import { useAppConfig } from "@/lib/future-lens/config-context";
import type { Language } from "@/lib/future-lens/i18n";
import { translations } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

type ChatReasoningProps = {
  children: string;
  isStreaming: boolean;
  language: Language;
  duration?: number;
};

/** AINO reasoning interaction adapted to the approved equal-width status capsule. */
export const ChatReasoning = memo(function ChatReasoning({ children, isStreaming, language, duration = 0 }: ChatReasoningProps) {
  const { textScale } = useAppConfig();
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const label = isStreaming
    ? t.chat_reasoning_running
    : duration > 0
      ? t.chat_reasoning_seconds.replace("{seconds}", String(duration))
      : t.chat_reasoning_done;

  return (
    <section className="w-full min-w-0" aria-label={label}>
      <button
        type="button"
        className="flex min-h-8 w-full touch-manipulation items-center gap-1.5 rounded-full border border-border/60 bg-muted/35 px-2.5 py-1 text-left text-muted-foreground backdrop-blur-xl transition-colors hover:bg-muted/55 hover:text-foreground"
        style={{ fontSize: `${12 * textScale * 0.9}px` }}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        {isStreaming
          ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={1.75} />
          : <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
        <Brain className="h-3 w-3 shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", isOpen && "rotate-90")} strokeWidth={1.75} />
      </button>
      {isOpen ? (
        <div className="mt-1.5 px-1 text-muted-foreground" style={{ fontSize: `${12 * textScale * 0.9}px` }}>
          <div className="max-h-[min(56vh,30rem)] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-muted/35 p-2.5 leading-relaxed">
            {children}
          </div>
        </div>
      ) : null}
    </section>
  );
});
