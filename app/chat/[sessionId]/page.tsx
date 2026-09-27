import { ChatSessionView } from "@/components/mobile/chat-session-view";

export default async function ChatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <ChatSessionView sessionId={sessionId} />;
}
