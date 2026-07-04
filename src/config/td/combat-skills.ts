import type { ProtagonistId } from "@/config/td/protagonists";

export type SkillDef = { nameZh: string; nameEn: string };

const HERO_PHYS: Record<ProtagonistId, SkillDef[]> = {
  goku: [
    { nameZh: "直拳", nameEn: "Straight Punch" },
    { nameZh: "连击", nameEn: "Combo Rush" },
    { nameZh: "回旋踢", nameEn: "Spin Kick" },
  ],
  vegeta: [
    { nameZh: "冲击拳", nameEn: "Impact Punch" },
    { nameZh: "飞膝", nameEn: "Flying Knee" },
    { nameZh: "重脚", nameEn: "Heavy Kick" },
  ],
  android18: [
    { nameZh: "手刀", nameEn: "Chop Strike" },
    { nameZh: "能量掌", nameEn: "Palm Blast" },
    { nameZh: "连环踢", nameEn: "Chain Kick" },
  ],
  tien: [
    { nameZh: "气弹", nameEn: "Ki Shot" },
    { nameZh: "四臂连打", nameEn: "Quad Strike" },
    { nameZh: "太阳拳", nameEn: "Solar Flash" },
  ],
  launch: [
    { nameZh: "鞭打", nameEn: "Whip Lash" },
    { nameZh: "投掷", nameEn: "Throw" },
    { nameZh: "急袭", nameEn: "Quick Raid" },
  ],
};

const HERO_MAG: Record<ProtagonistId, SkillDef[]> = {
  goku: [
    { nameZh: "气波", nameEn: "Ki Wave" },
    { nameZh: "元气弹", nameEn: "Spirit Ball" },
  ],
  vegeta: [
    { nameZh: "冲击波", nameEn: "Blast Wave" },
    { nameZh: "加农炮", nameEn: "Cannon" },
  ],
  android18: [
    { nameZh: "能量波", nameEn: "Energy Wave" },
    { nameZh: "光子炮", nameEn: "Photon Beam" },
  ],
  tien: [
    { nameZh: "气功炮", nameEn: "Tri-Beam" },
    { nameZh: "光杀炮", nameEn: "Dodom Beam" },
  ],
  launch: [
    { nameZh: "爆裂弹", nameEn: "Burst Shot" },
    { nameZh: "干扰波", nameEn: "Jam Wave" },
  ],
};

export function pickHeroPhysSkill(id: ProtagonistId): SkillDef {
  const list = HERO_PHYS[id];
  return list[Math.floor(Math.random() * list.length)]!;
}

export function pickHeroMagSkill(id: ProtagonistId): SkillDef {
  const list = HERO_MAG[id];
  return list[Math.floor(Math.random() * list.length)]!;
}

export function skillName(skill: SkillDef, locale: string): string {
  return locale === "zh" ? skill.nameZh : skill.nameEn;
}

/** 根据怪物名称推断招式 */
export function pickEnemySkill(mobName: string, isBoss: boolean): SkillDef {
  if (isBoss) {
    if (mobName.includes("大王") || mobName.includes("元帅") || mobName.includes("宗师"))
      return { nameZh: "必杀技", nameEn: "Finisher" };
    if (mobName.includes("BOSS") || mobName.includes("队长"))
      return { nameZh: "猛击", nameEn: "Smash" };
    return { nameZh: "首领技", nameEn: "Boss Skill" };
  }
  if (mobName.includes("法师") || mobName.includes("祭司") || mobName.includes("超能力"))
    return { nameZh: "魔法弹", nameEn: "Magic Bolt" };
  if (mobName.includes("射手") || mobName.includes("枪") || mobName.includes("炮"))
    return { nameZh: "远程射击", nameEn: "Ranged Shot" };
  if (mobName.includes("格斗") || mobName.includes("武道") || mobName.includes("杀手"))
    return { nameZh: "猛扑", nameEn: "Lunge" };
  if (mobName.includes("魔"))
    return { nameZh: "魔爪", nameEn: "Demon Claw" };
  return { nameZh: "普通攻击", nameEn: "Strike" };
}
