import type { AgentUiActivity, ChatEditableFile, ChatEditableFileWriteResult, ChatFileContent, ChatMessage } from "@ipollowork/chat-client";
import { useMemo, type RefObject } from "react";

import { ChatMessageRow } from "@/components/mobile/chat-message-row";
import { ChatToolTrace } from "@/components/mobile/chat-tool-trace";
import { deriveLatestArtifacts } from "@/lib/chat/artifact-display";
import type { Language } from "@/lib/future-lens/i18n";

export function ChatMessageList({ messages, language, isStreaming, activity, error, activeAssistantMessageId, latestRef, readArtifact, downloadArtifact, readEditableArtifact, writeEditableArtifact }: { messages: ChatMessage[]; language: Language; isStreaming: boolean; activity?: AgentUiActivity | null; error?: string | null; activeAssistantMessageId: string | null; latestRef: RefObject<HTMLDivElement | null>; readArtifact: (path: string) => Promise<ChatFileContent>; downloadArtifact: (path: string) => Promise<void>; readEditableArtifact: (path: string) => Promise<ChatEditableFile>; writeEditableArtifact: (input: { path: string; content: string; baseUpdatedAt: number; baseRevision: string }) => Promise<ChatEditableFileWriteResult> }) {
  const artifactsByPart = useMemo(() => deriveLatestArtifacts(messages), [messages]);
  return (
    <div className="space-y-4 py-4">
      {messages.map((message) => <ChatMessageRow key={message.info.id} message={message} language={language} isStreaming={isStreaming && activeAssistantMessageId === message.info.id} activity={activity} artifactsByPart={artifactsByPart} readArtifact={readArtifact} downloadArtifact={downloadArtifact} readEditableArtifact={readEditableArtifact} writeEditableArtifact={writeEditableArtifact} />)}
      {(isStreaming && !activeAssistantMessageId) || error ? <ChatToolTrace entries={[]} isStreaming={isStreaming && !activeAssistantMessageId} activity={activity} error={error} language={language} /> : null}
      <div ref={latestRef} aria-hidden className="h-px" />
    </div>
  );
}
