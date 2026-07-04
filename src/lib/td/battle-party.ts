import {
  ALLY_DEPLOY_LEVEL,
  allyName,
  maxAllySlots,
} from "@/config/td/battle-squads";
import {
  companionAtk,
  heroCombatStats,
  type CompanionKind,
  type HeroSave,
} from "@/config/td/rpg";

export type BattleAlly = {
  id: string;
  kind: CompanionKind | "hero";
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  mag: number;
  def: number;
  dodge: number;
  isHero: boolean;
};

export function alliesInBattle(save: HeroSave): CompanionKind[] {
  const slots = maxAllySlots(save.level);
  const order: CompanionKind[] = ["群", "粉", "编", "导"];
  const out: CompanionKind[] = [];
  for (const k of order) {
    if (out.length >= slots) break;
    if (save.level < ALLY_DEPLOY_LEVEL[k]) continue;
    if ((k === "编" || k === "导") && !save.companionUnlocked[k]) continue;
    out.push(k);
  }
  return out;
}

/** 构建上场队伍（主角 + 已登场助手） */
export function buildBattleParty(
  save: HeroSave,
  locale: string,
  buffs: string[],
): BattleAlly[] {
  const combat = heroCombatStats(save);
  let heroAtk = combat.atk;
  let heroHp = combat.maxHp;
  if (buffs.includes("pack")) {
    heroAtk += 2;
    heroHp += 10;
  }

  const party: BattleAlly[] = [
    {
      id: "hero",
      kind: "hero",
      name: "", // filled by caller
      hp: heroHp,
      maxHp: heroHp,
      atk: heroAtk,
      mag: combat.magDmg,
      def: combat.def,
      dodge: combat.dodge,
      isHero: true,
    },
  ];

  for (const k of alliesInBattle(save)) {
    const lv = save.companionLevel[k];
    const atk = companionAtk(k, lv);
    const hp = Math.floor(40 + lv * 18 + save.level * 2);
    party.push({
      id: `ally_${k}`,
      kind: k,
      name: allyName(k, locale),
      hp,
      maxHp: hp,
      atk,
      mag: Math.floor(atk * 0.4),
      def: Math.floor(4 + lv * 2),
      dodge: 3 + lv,
      isHero: false,
    });
  }
  return party;
}

export function partyPowerScore(party: BattleAlly[]): number {
  return party.reduce(
    (s, u) =>
      s + u.atk + u.mag * 0.8 + u.maxHp * 0.08 + u.def * 0.5 + (u.isHero ? 0 : u.atk * 0.2),
    0,
  );
}

export function livingParty(party: BattleAlly[]): BattleAlly[] {
  return party.filter((u) => u.hp > 0);
}

export function pickRandomTarget(party: BattleAlly[]): BattleAlly | null {
  const live = livingParty(party);
  if (live.length === 0) return null;
  const hero = live.find((u) => u.isHero);
  if (hero && Math.random() < 0.55) return hero;
  return live[Math.floor(Math.random() * live.length)]!;
}
