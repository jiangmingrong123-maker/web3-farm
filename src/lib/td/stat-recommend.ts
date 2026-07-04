import type { StatKey } from "@/config/td/hero-attributes";
import { getProtagonist, type ProtagonistId } from "@/config/td/protagonists";

/** 按主角流派推荐潜力点：力量型全力量、敏捷型全敏捷、魔力型全魔力 */
export function recommendStatDeltas(
  protagonistId: ProtagonistId,
  points: number,
): Record<StatKey, number> {
  if (points <= 0) return { str: 0, agi: 0, mag: 0 };
  const arch = getProtagonist(protagonistId).archetype;
  return {
    str: arch === "str" ? points : 0,
    agi: arch === "agi" ? points : 0,
    mag: arch === "mag" ? points : 0,
  };
}
