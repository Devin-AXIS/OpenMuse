import type { AgentUiActivity, ChatEditableFile, ChatEditableFileWriteResult, ChatFileContent, ChatMessage } from "@ipollowork/chat-client";
import { Fragment, lazy, memo, Suspense } from "react";

import { ChatMessageActions } from "@/components/mobile/chat-message-actions";
import { ChatReasoning } from "@/components/mobile/chat-reasoning";
import { ChatToolTrace } from "@/components/mobile/chat-tool-trace";
import { isCoreToolPart } from "@/lib/chat/tool-display";
import type { ChatArtifact } from "@/lib/chat/artifact-display";
import { useAppConfig } from "@/lib/future-lens/config-context";
import { DesignTokens } from "@/lib/future-lens/design-tokens";
import type { Language } from "@/lib/future-lens/i18n";
import { cn } from "@/lib/utils";

const LazyChatMarkdown = lazy(() => import("./chat-markdown").then((module) => ({ default: module.ChatMarkdown })));
const LazyChatArtifactCard = lazy(() => import("./chat-artifact-card").then((module) => ({ default: module.ChatArtifactCard })));

function textParts(message: ChatMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function isMarkdown(value: string) {
  return /(^|\n)#{1,6}\s|(^|\n)\s*(?:[-*+]\s|\d+\.\s|>\s|```)|\[[^\]]+\]\([^\)]+\)|\*\*[^*]+\*\*|`[^`]+`|\|.+\|/m.test(value);
}

function reasoningDuration(part: Extract<ChatMessage["parts"][number], { type: "reasoning" }>, isStreaming: boolean) {
  const duration = Math.round(((part.time.end ?? Date.now()) - part.time.start) / 1000);
  return Math.max(isStreaming ? 0 : 1, duration);
}

export const ChatMessageRow = memo(function ChatMessageRow({ message, language, isStreaming, activity, artifactsByPart, readArtifact, downloadArtifact, readEditableArtifact, writeEditableArtifact }: { message: ChatMessage; language: Language; isStreaming: boolean; activity?: AgentUiActivity | null; artifactsByPart: Map<string, ChatArtifact[]>; readArtifact: (path: string) => Promise<ChatFileContent>; downloadArtifact: (path: string) => Promise<void>; readEditableArtifact: (path: string) => Promise<ChatEditableFile>; writeEditableArtifact: (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => Promise<ChatEditableFileWriteResult> }) {
  const { textScale } = useAppConfig();
  const user = message.info.role === "user";
  const text = textParts(message);
  const hasVisibleParts = message.parts.some((part) =>
    (part.type === "text" && part.text.length > 0)
    || (!user && part.type === "reasoning" && part.text.trim().length > 0)
    || (!user && part.type === "tool" && isCoreToolPart(part)),
  );
  const showPendingTrace = !user && isStreaming && !hasVisibleParts;
  const bodyFontBase = DesignTokens.fontScale.bodyContent * 1.13;
  const bodyFontSize = bodyFontBase * textScale;

  return (
    <article className={cn("flex w-full min-w-0 max-w-full [content-visibility:auto] [contain-intrinsic-size:auto_140px]", user ? "justify-end" : "justify-start")}>
      <div className={cn("flex min-w-0 flex-col", user ? "items-end max-w-[85%] gap-2" : "items-start w-full gap-1.5")}>
        {message.parts.map((part) => {
          if (!user && part.type === "reasoning" && part.text.trim()) {
            return <ChatReasoning key={part.id} language={language} isStreaming={isStreaming} duration={reasoningDuration(part, isStreaming)}>{part.text}</ChatReasoning>;
          }
          if (!user && part.type === "tool" && isCoreToolPart(part)) {
            const artifacts = artifactsByPart.get(part.id) ?? [];
            return <Fragment key={part.id}><ChatToolTrace entries={[part]} isStreaming={isStreaming} activity={activity} language={language} />{artifacts.map((artifact) => <Suspense key={artifact.id} fallback={null}><LazyChatArtifactCard artifact={artifact} readArtifact={readArtifact} downloadArtifact={downloadArtifact} readEditableArtifact={readEditableArtifact} writeEditableArtifact={writeEditableArtifact} /></Suspense>)}</Fragment>;
          }
          if (part.type !== "text" || !part.text) return null;
          if (user) {
            return <div key={part.id} className="relative rounded-[1.25rem] rounded-tr-sm bg-muted px-3 py-2 text-muted-foreground"><p className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${bodyFontSize}px` }}>{part.text}</p></div>;
          }
          return !isStreaming && isMarkdown(part.text)
            ? <Suspense key={part.id} fallback={<p className="whitespace-pre-wrap leading-relaxed text-foreground" style={{ fontSize: `${bodyFontSize}px` }}>{part.text}</p>}><LazyChatMarkdown content={part.text} bodyFontSize={bodyFontBase} /></Suspense>
            : <p key={part.id} className="whitespace-pre-wrap leading-relaxed text-foreground" style={{ fontSize: `${bodyFontSize}px` }}>{part.text}</p>;
        })}
        {showPendingTrace ? <ChatToolTrace entries={[]} isStreaming activity={activity} language={language} /> : null}
        {!user && !isStreaming && text ? <ChatMessageActions text={text} language={language} /> : null}
      </div>
    </article>
  );
});
