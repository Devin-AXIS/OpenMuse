"use client";

import type { AgentUiActivity } from "@ipollowork/chat-client";
import {
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  FileText,
  FolderSearch,
  Globe,
  ListTodo,
  Loader2,
  Pencil,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { lazy, memo, Suspense, useMemo, useState } from "react";

import {
  classifyTool,
  extractWebResults,
  serializeToolInput,
  toolContext,
  toolOutput,
  toolTarget,
  type ChatToolPart,
  type ToolDisplayKind,
} from "@/lib/chat/tool-display";
import { useAppConfig } from "@/lib/future-lens/config-context";
import type { Language } from "@/lib/future-lens/i18n";
import { translations } from "@/lib/future-lens/i18n";
import { openInAppBrowser } from "@/lib/native/open-in-app-browser";
import { cn } from "@/lib/utils";

const LazyChatMarkdown = lazy(() => import("./chat-markdown").then((module) => ({ default: module.ChatMarkdown })));
const LazyBottomSheetModal = lazy(() => import("@/components/future-lens/ds/bottom-sheet-modal").then((module) => ({ default: module.BottomSheetModal })));

type ChatToolTraceProps = {
  entries: ChatToolPart[];
  isStreaming: boolean;
  activity?: AgentUiActivity | null;
  error?: string | null;
  language: Language;
};

function StreamingDots() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground/70" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1 w-1 rounded-full bg-current motion-safe:animate-bounce"
          style={{ animationDelay: `${index * 130}ms`, animationDuration: "0.68s" }}
        />
      ))}
    </span>
  );
}

function labelForKind(kind: ToolDisplayKind, language: Language): string {
  const t = translations[language];
  switch (kind) {
    case "read": return t.tool_action_read;
    case "write": return t.tool_action_write;
    case "edit": return t.tool_action_edit;
    case "exec": return t.tool_action_exec;
    case "searchFiles": return t.tool_action_search_files;
    case "listDir": return t.tool_action_list_dir;
    case "web": return t.tool_action_web;
    case "task": return t.tool_action_task;
    default: return t.tool_action_generic;
  }
}

function KindIcon({ kind, className }: { kind: ToolDisplayKind; className?: string }) {
  const props = { className: cn("h-3 w-3 shrink-0", className), strokeWidth: 2 };
  switch (kind) {
    case "read": return <FileText {...props} />;
    case "write": return <FileText {...props} />;
    case "edit": return <Pencil {...props} />;
    case "exec": return <Terminal {...props} />;
    case "searchFiles":
    case "listDir": return <FolderSearch {...props} />;
    case "web": return <Globe {...props} />;
    case "task": return <ListTodo {...props} />;
    default: return <Wrench {...props} />;
  }
}

function StateIcon({ status }: { status: ChatToolPart["state"]["status"] }) {
  if (status === "running") return <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary/80" strokeWidth={2} />;
  if (status === "pending") return <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.75} />;
  if (status === "error") return <X className="h-3 w-3 shrink-0 text-red-500 dark:text-red-400" strokeWidth={2} />;
  return <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function usesDetailSheet(kind: ToolDisplayKind): boolean {
  return kind === "read" || kind === "web";
}

function InlineToolDetail({ entry, language }: { entry: ChatToolPart; language: Language }) {
  const t = translations[language];
  const input = serializeToolInput(entry);
  const output = toolOutput(entry);
  if (!input && !output) return <p className="px-1 py-1 text-[11px] text-muted-foreground/70">{t.tool_detail_no_content}</p>;
  return (
    <div className="mt-1.5 w-full min-w-0 space-y-1.5 px-1 text-[11px] text-muted-foreground">
      {input ? (
        <div>
          <div className="mb-0.5 font-medium text-foreground/80">{t.tool_detail_input}</div>
          <pre className="max-h-[min(48vh,24rem)] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-muted/45 p-2">{input}</pre>
        </div>
      ) : null}
      {output ? (
        <div>
          <div className="mb-0.5 font-medium text-foreground/80">{t.tool_detail_output}</div>
          <pre className="max-h-[min(56vh,30rem)] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-muted/45 p-2">{output}</pre>
        </div>
      ) : null}
    </div>
  );
}

function ToolDetail({ entry, language }: { entry: ChatToolPart; language: Language }) {
  const t = translations[language];
  const kind = classifyTool(entry.tool);
  const context = toolContext(entry);
  const input = serializeToolInput(entry);
  const output = toolOutput(entry);
  const results = useMemo(() => kind === "web" ? extractWebResults(output) : [], [kind, output]);

  return (
    <div className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3">
      {context ? (
        <div className="rounded-xl border border-border/50 bg-muted/35 px-3 py-2 text-[12px] leading-relaxed text-foreground/80 break-words">
          {context}
        </div>
      ) : null}

      {results.length ? (
        <section className="space-y-2" aria-label={t.tool_detail_results}>
          <h3 className="px-0.5 text-[12px] font-medium text-muted-foreground">{t.tool_detail_results}</h3>
          <div className="overflow-hidden rounded-2xl border border-border/55 bg-background/55 backdrop-blur-xl">
            {results.map((result, index) => (
              <button
                key={result.url}
                type="button"
                onClick={() => void openInAppBrowser(result.url)}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-muted/45 active:bg-muted/60",
                  index > 0 && "border-t border-border/45",
                )}
              >
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug text-foreground">{result.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">{safeHost(result.url)}</span>
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {output && (kind !== "web" || !results.length) ? (
        <section className="space-y-2">
          <h3 className="px-0.5 text-[12px] font-medium text-muted-foreground">{t.tool_detail_output}</h3>
          {kind === "read" || kind === "web" ? (
            <div className="rounded-2xl border border-border/55 bg-background/55 p-3 backdrop-blur-xl">
              <Suspense fallback={<pre className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/85">{output}</pre>}>
                <LazyChatMarkdown content={output} bodyFontSize={12.2} />
              </Suspense>
            </div>
          ) : (
            <pre className="max-h-[min(64vh,34rem)] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/55 bg-muted/45 p-3 text-[11px] leading-relaxed text-foreground/85">
              {output}
            </pre>
          )}
        </section>
      ) : null}

      {input ? (
        <details className="group overflow-hidden rounded-xl border border-border/45 bg-muted/25">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[12px] text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" strokeWidth={1.75} />
            {t.tool_detail_input}
          </summary>
          <pre className="max-h-[40vh] overflow-auto border-t border-border/40 px-3 py-3 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">{input}</pre>
        </details>
      ) : null}

      {!context && !input && !output ? (
        <p className="py-8 text-center text-[12px] text-muted-foreground">{t.tool_detail_no_content}</p>
      ) : null}
    </div>
  );
}

/** AINO status pills: one short capsule per runtime state; details never spill into the chat body. */
export const ChatToolTrace = memo(function ChatToolTrace({ entries, isStreaming, activity, error, language }: ChatToolTraceProps) {
  const { textScale } = useAppConfig();
  const t = translations[language];
  const [detailId, setDetailId] = useState<string | null>(null);
  const [inlineDetailId, setInlineDetailId] = useState<string | null>(null);
  const [detailWasOpened, setDetailWasOpened] = useState(false);
  const detailEntry = entries.find((entry) => entry.id === detailId) ?? null;
  const pillFontSize = 12 * textScale * 0.9;

  if (!entries.length) {
    if (error) {
      return (
        <div className="flex min-h-8 w-full items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1 text-red-600 dark:text-red-400" role="alert" style={{ fontSize: `${pillFontSize}px` }}>
          <X className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="truncate">{t.tool_failed}</span>
        </div>
      );
    }
    if (!isStreaming) return null;
    const label = activity?.phase === "tool" || activity?.phase === "working" ? t.tool_running : t.chat_reasoning_running;
    return (
      <div className="flex min-h-8 w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/35 px-2.5 py-1 text-muted-foreground backdrop-blur-xl" style={{ fontSize: `${pillFontSize}px` }}>
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={1.75} />
        <span className="truncate">{label}</span>
        <StreamingDots />
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full max-w-full flex-col gap-1.5" aria-label={language === "en" ? "Work status" : "执行状态"}>
        {entries.map((entry) => {
          const kind = classifyTool(entry.tool);
          const target = toolTarget(entry);
          const label = labelForKind(kind, language);
          const failed = entry.state.status === "error";
          const opensSheet = usesDetailSheet(kind);
          const inlineOpen = !opensSheet && inlineDetailId === entry.id;
          const content = (
            <>
              <StateIcon status={entry.state.status} />
              <KindIcon kind={kind} className={failed ? "text-red-500 dark:text-red-400" : "text-muted-foreground"} />
              <span className="min-w-0 flex-1 truncate text-foreground/85">
                {label}{target ? <span className="text-muted-foreground"> · {target}</span> : null}
              </span>
              <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground/65 transition-transform", inlineOpen && "rotate-90")} strokeWidth={1.75} />
            </>
          );
          const capsuleClassName = cn(
            "flex min-h-8 w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left backdrop-blur-xl",
            failed
              ? "border-red-500/20 bg-red-500/[0.06]"
              : "border-emerald-500/20 bg-emerald-500/[0.07] dark:bg-emerald-500/[0.09]",
          );
          return (
            <div key={entry.id} className="w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (opensSheet) {
                    setDetailWasOpened(true);
                    setDetailId(entry.id);
                  } else {
                    setInlineDetailId((current) => current === entry.id ? null : entry.id);
                  }
                }}
                className={cn(capsuleClassName, "touch-manipulation transition-colors hover:bg-emerald-500/12 active:bg-emerald-500/15 dark:hover:bg-emerald-500/15")}
                style={{ fontSize: `${pillFontSize}px` }}
                aria-label={`${label}${target ? ` ${target}` : ""}`}
                aria-expanded={opensSheet ? detailId === entry.id : inlineOpen}
              >
                {content}
              </button>
              {inlineOpen ? <InlineToolDetail entry={entry} language={language} /> : null}
            </div>
          );
        })}
      </div>

      {detailWasOpened ? (
        <Suspense fallback={null}>
          <LazyBottomSheetModal
            isOpen={detailEntry != null}
            onClose={() => setDetailId(null)}
            title={detailEntry ? `${labelForKind(classifyTool(detailEntry.tool), language)}${toolTarget(detailEntry) ? ` · ${toolTarget(detailEntry)}` : ""}` : undefined}
          >
            {detailEntry ? <ToolDetail entry={detailEntry} language={language} /> : null}
          </LazyBottomSheetModal>
        </Suspense>
      ) : null}
    </>
  );
});
