"use client";

import { useTranslations } from "next-intl";
import { questLabel, visibleQuests } from "@/config/td/quests";
import type { HeroSave } from "@/config/td/rpg";
import { questKillProgress } from "@/lib/td/quest-progress";

type Props = {
  save: HeroSave;
  locale: string;
};

export function TdQuestTracker({ save, locale }: Props) {
  const t = useTranslations("td");
  const quests = visibleQuests(save.worldMap, save.questsClaimed).slice(0, 3);
  if (quests.length === 0) return null;

  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
        {t("questTitle")}
      </p>
      <ul className="space-y-1.5">
        {quests.map((q) => {
          const cur = questKillProgress(save, q);
          const done = cur >= q.count;
          return (
            <li key={q.id} className="text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className={done ? "text-emerald-300" : "text-white/75"}>
                  {questLabel(q, locale)}
                </span>
                <span className="shrink-0 text-[10px] text-white/45">
                  {cur}/{q.count}
                </span>
              </div>
              <p className="text-[9px] text-white/35">
                {t("questKillTarget", { name: q.monster, count: q.count })} ·{" "}
                {t("questRewardExp", { exp: q.rewardExp })}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
