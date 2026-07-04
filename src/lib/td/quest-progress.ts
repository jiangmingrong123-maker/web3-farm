import { questLabel, visibleQuests, type QuestDef } from "@/config/td/quests";
import { syncHeroLevel, type HeroSave } from "@/config/td/rpg";

export type QuestLogLine = { text: string; exp: number };

export function questKillProgress(save: HeroSave, quest: QuestDef): number {
  return Math.min(quest.count, save.questKills[quest.monster] ?? 0);
}

export function applyMonsterKills(
  save: HeroSave,
  kills: Record<string, number>,
  locale: string,
): { save: HeroSave; logs: QuestLogLine[] } {
  if (Object.keys(kills).length === 0) return { save, logs: [] };
  const zh = locale === "zh";
  const next = structuredClone(save);
  for (const [name, n] of Object.entries(kills)) {
    if (n <= 0) continue;
    next.questKills[name] = (next.questKills[name] ?? 0) + n;
  }
  const logs: QuestLogLine[] = [];
  for (const quest of visibleQuests(next.worldMap, next.questsClaimed)) {
    const prog = next.questKills[quest.monster] ?? 0;
    if (prog < quest.count) continue;
    next.questsClaimed = [...next.questsClaimed, quest.id];
    next.exp += quest.rewardExp;
    logs.push({
      exp: quest.rewardExp,
      text: zh
        ? `★ 任务完成「${questLabel(quest, locale)}」→ +${quest.rewardExp} 经验`
        : `★ Quest done: ${questLabel(quest, locale)} → +${quest.rewardExp} EXP`,
    });
  }
  return { save: syncHeroLevel(next), logs };
}

/** 扫图每遍估算杀怪（用于任务计数） */
export function sweepKillCredit(
  mob1: string,
  mob2: string,
  boss: string,
  mode: "boss" | "full",
): Record<string, number> {
  if (mode === "boss") return { [boss]: 1 };
  return { [mob1]: 2, [mob2]: 2 };
}
