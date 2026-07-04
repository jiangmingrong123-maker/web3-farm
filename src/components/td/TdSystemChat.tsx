"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  chatTagKind,
  filterSystemLogs,
  logLineColor,
  type ChatFilter,
  type SystemLogLine,
} from "@/lib/td/system-log";

type Props = {
  lines: SystemLogLine[];
  locale: string;
  /** 侧栏扫图面板用：更矮、默认筛扫图 */
  compact?: boolean;
  defaultFilter?: ChatFilter;
};

const FILTERS: ChatFilter[] = ["all", "sweep", "battle", "economy"];

export function TdSystemChat({
  lines,
  locale,
  compact,
  defaultFilter = "all",
}: Props) {
  const t = useTranslations("td");
  const [filter, setFilter] = useState<ChatFilter>(defaultFilter);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const filtered = filterSystemLogs(lines, filter);

  useEffect(() => {
    if (compact) setFilter(defaultFilter);
  }, [compact, defaultFilter]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length, filter]);

  const filterLabel = (f: ChatFilter) => {
    switch (f) {
      case "all":
        return t("chatFilterAll");
      case "sweep":
        return t("chatFilterSweep");
      case "battle":
        return t("chatFilterBattle");
      case "economy":
        return t("chatFilterEcon");
    }
  };

  return (
    <section
      className={`overflow-hidden rounded-lg border border-sky-900/50 bg-gradient-to-b from-[#0a1628]/95 to-[#061018]/95 shadow-inner ${
        compact ? "" : "ring-1 ring-sky-500/10"
      }`}
    >
      {!compact && (
        <div className="border-b border-sky-800/40 px-2.5 py-1">
          <p className="text-[10px] font-medium text-sky-300/80">{t("systemChatTitle")}</p>
        </div>
      )}

      <div
        ref={boxRef}
        className={`overflow-y-auto overflow-x-hidden px-2 py-1.5 font-mono leading-relaxed ${
          compact ? "h-28" : "h-[7.75rem]"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(56,120,180,0.07) 1px, transparent 0)",
          backgroundSize: "12px 12px",
        }}
      >
        {filtered.length === 0 ? (
          <p className="text-[10px] text-white/30">{t("systemChatEmpty")}</p>
        ) : (
          filtered.map((line) => (
            <p key={line.id} className="mb-0.5 text-[10px] leading-snug">
              <span className="text-rose-400/95">{chatTagKind(line.kind, locale)}</span>{" "}
              <span className={logLineColor(line)}>{line.text}</span>
            </p>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-0.5 border-t border-sky-900/50 bg-black/30 px-1 py-1">
        {FILTERS.map((f) => {
          const active = filter === f;
          const count =
            f === "all" ? lines.length : lines.filter((l) => l.kind === f).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 rounded px-1 py-0.5 text-[9px] transition-colors ${
                active
                  ? "bg-sky-600/30 text-sky-200 ring-1 ring-sky-500/30"
                  : "text-white/40 hover:text-white/65"
              }`}
            >
              {filterLabel(f)}
              {count > 0 && (
                <span className="ml-0.5 text-[8px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
