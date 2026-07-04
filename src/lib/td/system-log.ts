import type { SweepLogEntry } from "@/lib/td/sweep-loot";

export type SystemLogKind = "system" | "sweep" | "battle" | "economy";

export type SystemLogLine = {
  id: string;
  ts: number;
  kind: SystemLogKind;
  sweepType?: SweepLogEntry["type"];
  text: string;
};

export type ChatFilter = "all" | "sweep" | "battle" | "economy";

let logSeq = 0;

export function mkLogId(): string {
  logSeq += 1;
  return `${Date.now()}-${logSeq}`;
}

export function sweepEntryToLog(
  entry: SweepLogEntry,
): Pick<SystemLogLine, "kind" | "sweepType" | "text"> {
  return { kind: "sweep", sweepType: entry.type, text: entry.text };
}

export function appendSystemLogs(
  prev: SystemLogLine[],
  items: Pick<SystemLogLine, "kind" | "text" | "sweepType">[],
  max = 300,
): SystemLogLine[] {
  const ts = Date.now();
  const added: SystemLogLine[] = items.map((item) => ({
    ...item,
    id: mkLogId(),
    ts,
  }));
  return [...prev, ...added].slice(-max);
}

export function filterSystemLogs(
  lines: SystemLogLine[],
  filter: ChatFilter,
): SystemLogLine[] {
  if (filter === "all") return lines;
  return lines.filter((l) => l.kind === filter);
}

export function logLineColor(line: SystemLogLine): string {
  if (line.sweepType) {
    const map: Record<SweepLogEntry["type"], string> = {
      summary: "text-violet-200/85",
      exp: "text-sky-300/95",
      loot: "text-amber-300/95",
      equip: "text-emerald-300",
      recycle: "text-white/50",
      bag: "text-white/70",
      levelup: "text-gold font-semibold",
      quest: "text-emerald-400 font-medium",
    };
    return map[line.sweepType];
  }
  switch (line.kind) {
    case "battle":
      return "text-amber-200/95";
    case "economy":
      return "text-cyan-200/90";
    case "sweep":
      return "text-violet-200/85";
    default:
      return "text-white/75";
  }
}

export function chatTagKind(kind: SystemLogKind, locale: string): string {
  const zh = locale === "zh";
  switch (kind) {
    case "sweep":
      return zh ? "[扫图]" : "[Sweep]";
    case "battle":
      return zh ? "[战斗]" : "[Battle]";
    case "economy":
      return zh ? "[经济]" : "[Gold]";
    default:
      return zh ? "[系统]" : "[Sys]";
  }
}
