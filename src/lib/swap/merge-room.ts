import type { ApiRoom, ChatMessage } from "./api-types";

/** Merge polled room into UI state — keep newest messages by id (handles cache / race). */
export function mergeRooms(prev: ApiRoom | null, next: ApiRoom): ApiRoom {
  if (!prev || prev.id !== next.id) return next;

  const byId = new Map<string, ChatMessage>();
  for (const m of prev.messages) byId.set(m.id, m);
  for (const m of next.messages) byId.set(m.id, m);

  const messages = Array.from(byId.values()).sort((a, b) => a.at - b.at);

  return { ...next, messages };
}
