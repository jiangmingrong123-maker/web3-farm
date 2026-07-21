import {
  ALLY_DEPLOY_LEVEL,
  allyName,
  maxAllySlots,
} from "@/config/td/battle-squads";
import {
  MAX_BATTLE_SLOTS,
  PET_SUMMON_ORDER,
  calcPetCombatStats,
  getPetDef,
} from "@/config/td/pet-catalog";
import {
  ensureCompanionMaps,
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

/** 手动上阵优先；空阵容时回退自动填充已解锁 */
export function alliesInBattle(save: HeroSave): CompanionKind[] {
  const s = ensureCompanionMaps(save);
  const slots = maxAllySlots(s.level);
  const out: CompanionKind[] = [];

  for (const id of s.battleParty) {
    if (out.length >= slots) break;
    if (!id) continue;
    if (!s.companionUnlocked[id]) continue;
    if (s.level < ALLY_DEPLOY_LEVEL[id]) continue;
    if (out.includes(id)) continue;
    out.push(id);
  }

  if (out.length > 0) return out;

  for (const k of PET_SUMMON_ORDER) {
    if (out.length >= slots) break;
    if (!s.companionUnlocked[k]) continue;
    if (s.level < ALLY_DEPLOY_LEVEL[k]) continue;
    out.push(k);
  }
  return out;
}

/** 把宠物放入上阵格（可替换；已在阵中则互换） */
export function setBattleSlot(
  save: HeroSave,
  slotIndex: number,
  petId: CompanionKind | null,
): HeroSave | null {
  const s = ensureCompanionMaps(save);
  if (slotIndex < 0 || slotIndex >= MAX_BATTLE_SLOTS) return null;
  if (petId != null) {
    if (!s.companionUnlocked[petId]) return null;
    if (s.level < ALLY_DEPLOY_LEVEL[petId]) return null;
  }
  const party = [...s.battleParty] as (CompanionKind | null)[];
  while (party.length < MAX_BATTLE_SLOTS) party.push(null);

  if (petId != null) {
    const existing = party.findIndex((x) => x === petId);
    if (existing >= 0 && existing !== slotIndex) {
      party[existing] = party[slotIndex];
    }
  }
  party[slotIndex] = petId;
  return { ...s, battleParty: party.slice(0, MAX_BATTLE_SLOTS) };
}

export function clearBattleSlot(save: HeroSave, slotIndex: number): HeroSave | null {
  return setBattleSlot(save, slotIndex, null);
}

/** 构建上场队伍（主角 + 已登场宠物） */
export function buildBattleParty(
  save: HeroSave,
  locale: string,
  buffs: string[],
): BattleAlly[] {
  const s = ensureCompanionMaps(save);
  const combat = heroCombatStats(s);
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
      name: "",
      hp: heroHp,
      maxHp: heroHp,
      atk: heroAtk,
      mag: combat.magDmg,
      def: combat.def,
      dodge: combat.dodge,
      isHero: true,
    },
  ];

  for (const k of alliesInBattle(s)) {
    const def = getPetDef(k);
    const lv = Math.min(s.companionLevel[k] ?? 1, s.level);
    const cultivate = s.companionCultivate?.[k] ?? 0;
    const neidan = s.companionNeidan?.[k] ?? {};
    const stats = def
      ? calcPetCombatStats(def, lv, cultivate, neidan)
      : {
          atk: 4 + lv * 2,
          hp: 40 + lv * 10,
          def: 2 + lv,
          mag: 2,
          crit: 2,
          hit: 5,
        };

    party.push({
      id: `ally_${k}`,
      kind: k,
      name: allyName(k, locale),
      hp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      mag: stats.mag,
      def: stats.def,
      dodge: 3 + lv + Math.floor(stats.hit / 4),
      isHero: false,
    });
  }
  return party;
}

export function partyPowerScore(party: BattleAlly[]): number {
  return party.reduce(
    (s, u) =>
      s +
      u.atk +
      u.mag * 0.8 +
      u.maxHp * 0.08 +
      u.def * 0.5 +
      (u.isHero ? 0 : u.atk * 0.2),
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
