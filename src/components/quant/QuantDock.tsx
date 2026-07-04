"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

export type QuantTab = "strategies" | "backtest" | "signals" | "paper" | "connectors";

type Props = {
  tab: QuantTab;
  onTab: (t: QuantTab) => void;
};

const TABS: QuantTab[] = ["strategies", "backtest", "signals", "paper", "connectors"];

export function QuantDock({ tab, onTab }: Props) {
  const t = useTranslations("quant");

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-1">
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onTab(id)}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
            tab === id
              ? "bg-gold/20 text-gold"
              : "text-white/50 hover:bg-white/5 hover:text-white/80"
          }`}
        >
          {t(`tab_${id}`)}
        </button>
      ))}
    </nav>
  );
}

export function QuantCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
