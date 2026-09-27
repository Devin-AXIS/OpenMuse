import type { ChatTodo } from "@ipollowork/chat-client";
import { ArrowRight, Check, ChevronDown, Circle, ListTodo, Loader2, X } from "lucide-react";
import { memo, useState } from "react";

import type { Language } from "@/lib/future-lens/i18n";
import { translations } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

const IPOLLOOS_TODO_ROW_CLASS = "mx-3 mb-1.5 flex w-[calc(100%-24px)] max-w-full flex-col overflow-hidden rounded-2xl border border-primary/15 bg-background/72 shadow-[0_10px_34px_-22px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:bg-white/[0.075] dark:border-white/10";
const IPOLLOOS_TODO_LIST_CLASS = "border-t border-border/45 bg-background/70 px-2.5 py-2.5 text-[12px] dark:bg-black/20";

function compactTodoTitle(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= 16 ? text : `${text.slice(0, 15)}…`;
}

/** Direct extraction of AINO's IPOLLOOS Todo header strip, adapted only to OpenCode Todo data. */
export const ChatTodoCard = memo(function ChatTodoCard({ todos, language, isStreaming }: { todos: ChatTodo[]; language: Language; isStreaming: boolean }) {
  const [open, setOpen] = useState(false);
  if (!todos.length) return null;
  const t = translations[language];
  const total = todos.length;
  const done = todos.filter((todo) => todo.status === "completed" || todo.status === "cancelled").length;
  const running = todos.filter((todo) => todo.status === "in_progress").length;
  const remaining = total - done;
  const workingIndex = todos.findIndex((todo) => todo.status === "in_progress");
  const pendingIndex = todos.findIndex((todo) => todo.status === "pending");
  const workingItem = todos[workingIndex >= 0 ? workingIndex : isStreaming ? pendingIndex : -1];
  const activeText = workingItem?.content.trim() ?? "";
  const executing = isStreaming && remaining > 0;
  const finished = remaining <= 0;
  const headline = executing ? (activeText ? compactTodoTitle(activeText) : t.tool_running) : t.todo_title;
  const progress = Math.round(((done + Math.min(running, total - done) * 0.5) / total) * 100);
  return (
    <div className={IPOLLOOS_TODO_ROW_CLASS}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full min-w-0 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-primary/[0.035] active:opacity-90 dark:hover:bg-white/[0.045]" aria-expanded={open} aria-label={`${headline} ${done}/${total}`}>
        {finished ? <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/45 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span> : executing ? <span className="relative flex h-4 w-4 shrink-0 items-center justify-center"><span className="absolute size-[14px] rounded-full border border-primary/20" /><span className="absolute size-[14px] rounded-full border-[1.5px] border-transparent border-t-primary/90 border-r-primary/25 animate-spin [animation-duration:0.9s]" /></span> : <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />}
        <span className="min-w-0 flex-1 text-[12px] font-medium leading-tight">
          {executing && activeText ? <span className="flex min-w-0 w-full items-center gap-1"><span className="shrink-0 text-[11px] font-semibold tabular-nums text-primary/90">{t.tool_running}</span><span className="shrink-0 text-muted-foreground/35">·</span><span className="min-w-0 flex-1 truncate text-foreground/90" title={activeText}>{headline}</span></span> : <span className="block min-w-0 truncate text-foreground/85">{headline}</span>}
        </span>
        <div className="h-1 w-14 max-w-[25%] shrink-0 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary/75 transition-all" style={{ width: `${progress}%` }} /></div>
        <span className="shrink-0 tabular-nums text-[11px] font-semibold leading-none text-muted-foreground/90"><span className="text-foreground/85">{done}</span><span className="px-[1px] text-muted-foreground/35">/</span><span>{total}</span></span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>
      {open ? <ul className={IPOLLOOS_TODO_LIST_CLASS} role="list" aria-busy={executing}>{todos.map((todo, index) => {
        const doneItem = todo.status === "completed";
        const cancelled = todo.status === "cancelled";
        const working = !doneItem && !cancelled && index === (workingIndex >= 0 ? workingIndex : pendingIndex);
        const staleRunning = todo.status === "in_progress" && !working;
        return <li key={`${todo.priority}:${todo.content}:${index}`} className="flex min-w-0 items-start gap-2.5 py-1.5 first:pt-0 last:pb-0"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">{doneItem || cancelled ? <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span> : working ? <span className="flex h-4 w-4 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary"><Loader2 className="h-2.5 w-2.5 animate-spin" strokeWidth={2.5} /></span> : staleRunning ? <span className="relative flex h-4 w-4 items-center justify-center text-muted-foreground/70"><Circle className="h-4 w-4" strokeWidth={2} /><ArrowRight className="absolute h-2.5 w-2.5" strokeWidth={2.5} /></span> : <Circle className="h-4 w-4 text-foreground/25" strokeWidth={2} />}</span>{cancelled ? <span className="flex min-w-0 flex-1 items-center gap-1.5 break-words text-muted-foreground line-through"><X className="h-3 w-3 shrink-0 opacity-50" />{todo.content}</span> : <span className={cn("min-w-0 flex-1 break-words leading-snug transition-colors", doneItem && "text-muted-foreground/80 line-through", (working || todo.status === "in_progress") && "text-foreground/90 font-medium")}>{todo.content}</span>}</li>;
      })}</ul> : null}
    </div>
  );
});
