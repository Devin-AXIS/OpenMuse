import type { ChatMessage } from "@ipollowork/chat-client";

export type MessageDelta = { messageId: string; partId: string; delta: string };

export function buildMessageIndex(messages: ChatMessage[]) {
  return new Map(messages.map((message, index) => [message.info.id, index]));
}

export function resolveMessageIndex(messages: ChatMessage[], index: Map<string, number>, messageId: string) {
  const cached = index.get(messageId);
  if (cached !== undefined && messages[cached]?.info.id === messageId) return cached;
  const resolved = messages.findIndex((message) => message.info.id === messageId);
  if (resolved >= 0) index.set(messageId, resolved);
  return resolved;
}

export function applyMessageDeltas(messages: ChatMessage[], index: Map<string, number>, deltas: Iterable<MessageDelta>) {
  const byMessage = new Map<string, Map<string, string>>();
  for (const item of deltas) {
    const partDeltas = byMessage.get(item.messageId) ?? new Map<string, string>();
    partDeltas.set(item.partId, `${partDeltas.get(item.partId) ?? ""}${item.delta}`);
    byMessage.set(item.messageId, partDeltas);
  }

  let next: ChatMessage[] | null = null;
  for (const [messageId, partDeltas] of byMessage) {
    const messageIndex = resolveMessageIndex(messages, index, messageId);
    if (messageIndex < 0) continue;
    const message = (next ?? messages)[messageIndex];
    let changed = false;
    const parts = message.parts.map((part) => {
      const delta = partDeltas.get(part.id);
      if (!delta || (part.type !== "text" && part.type !== "reasoning")) return part;
      changed = true;
      return { ...part, text: `${part.text}${delta}` };
    });
    if (!changed) continue;
    next ??= messages.slice();
    next[messageIndex] = { ...message, parts };
  }
  return next ?? messages;
}
