"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/swap/api-types";
import { sendMessageApi } from "@/lib/swap/api";

interface ChatPanelProps {
  roomId: string;
  messages: ChatMessage[];
  address?: string;
  nickname?: string;
}

export function ChatPanel({ roomId, messages, address, nickname }: ChatPanelProps) {
  const t = useTranslations("swap");
  const [text, setText] = useState("");
  const [name, setName] = useState(nickname ?? "");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    await sendMessageApi(roomId, trimmed, name || t("guestName"), { address });
    setText("");
    setSending(false);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <h2 className="mb-3 text-sm font-bold text-white/70">{t("chatTitle")}</h2>

      <div className="mb-3 h-48 overflow-y-auto rounded-lg border border-white/8 bg-black/40 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-white/30">{t("chatEmpty")}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-2 text-xs">
              <span className="font-semibold text-gold/80">{m.nickname}</span>
              <span className="mx-1 text-white/25">·</span>
              <span className="text-white/70">{m.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("chatNickname")}
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white sm:w-28"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("chatPlaceholder")}
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={handleSend}
          className="rounded-full bg-gold/90 px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
        >
          {t("chatSend")}
        </button>
      </div>
    </section>
  );
}
