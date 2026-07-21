"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ALLY_DEPLOY_LEVEL,
  allyName,
  maxAllySlots,
  PARTY_ALLY_SLOTS,
} from "@/config/td/battle-squads";
import {
  COMPANION_UNLOCK_GOLD,
  ensureCompanionMaps,
  type CompanionKind,
  type HeroSave,
} from "@/config/td/rpg";
import {
  MAX_BATTLE_SLOTS,
  MAX_CULTIVATE_LEVEL,
  MAX_NEIDAN_LEVEL,
  NEIDAN_SLOTS,
  NEIDAN_SLOT_LABEL_EN,
  NEIDAN_SLOT_LABEL_ZH,
  PET_CATALOG,
  calcPetCombatStats,
  petQualityLabel,
  petRole,
  petSummonRoadmap,
  type NeidanSlot,
} from "@/config/td/pet-catalog";
import { alliesInBattle } from "@/lib/td/battle-party";
import { upgradeCost, type UpgradeKind } from "@/lib/td/rpg-storage";

function slotUnlockLevel(slotIndex: number): number {
  const row = PARTY_ALLY_SLOTS.find((r) => r.allies === slotIndex + 1);
  return row?.minLevel ?? 99;
}

type Tab = "battle" | "cultivate" | "neidan";

type Props = {
  save: HeroSave;
  locale: string;
  gold: number;
  onUpgrade: (kind: UpgradeKind) => void;
};

export function TdCompanionPanel({ save, locale, gold, onUpgrade }: Props) {
  const t = useTranslations("td");
  const s = ensureCompanionMaps(save);
  const deployed = alliesInBattle(s);
  const openSlots = maxAllySlots(s.level);
  const roadmap = petSummonRoadmap(s.level, locale);
  const [tab, setTab] = useState<Tab>("battle");
  const [selected, setSelected] = useState<CompanionKind | null>(
    deployed[0] ?? null,
  );
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  const selectedDef = selected ? PET_CATALOG.find((p) => p.id === selected) : null;
  const selectedStats =
    selected && selectedDef
      ? calcPetCombatStats(
          selectedDef,
          Math.min(s.companionLevel[selected] ?? 1, s.level),
          s.companionCultivate[selected] ?? 0,
          s.companionNeidan[selected] ?? {},
        )
      : null;

  const neidanLabel = (slot: NeidanSlot) =>
    locale === "zh" ? NEIDAN_SLOT_LABEL_ZH[slot] : NEIDAN_SLOT_LABEL_EN[slot];

  return (
    <section className="space-y-3">
      {/* 召唤路线图 */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <h3 className="text-xs font-semibold text-amber-100/90">{t("petSummonRoadmap")}</h3>
        <p className="mb-2 mt-1 text-[10px] text-white/40">{t("petSummonRoadmapHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-white/10 text-white/45">
                <th className="pb-1.5 pr-2 font-medium">{t("petColTier")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColName")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColLevel")}</th>
                <th className="pb-1.5 pr-2 font-medium">{t("petColCost")}</th>
                <th className="pb-1.5 font-medium">{t("petColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {roadmap.map((p) => {
                const unlocked = s.companionUnlocked[p.id];
                const inBattle = deployed.includes(p.id);
                let status = t("petStatusLocked");
                if (!p.canSummon) status = t("petStatusNeedLevel", { level: p.summonLevel });
                else if (inBattle) status = t("petStatusBattle");
                else if (unlocked) status = t("petStatusOwned");
                else if (p.summonGold === 0) status = t("petStatusFree");
                else status = t("petStatusSummonable");
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 ${
                      p.canSummon && !unlocked ? "text-amber-100/90" : "text-white/65"
                    }`}
                  >
                    <td className="py-1.5 pr-2">
                      T{p.tier}
                      <span className="ml-1 text-white/30">{p.qualityLabel}</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-black/40 text-[9px] font-bold">
                        {p.glyph}
                      </span>
                      {p.name}
                    </td>
                    <td className="py-1.5 pr-2">Lv.{p.summonLevel}</td>
                    <td className="py-1.5 pr-2">
                      {p.summonGold > 0 ? `${p.summonGold}金` : t("petCostFree")}
                    </td>
                    <td className="py-1.5">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
        {(
          [
            ["battle", "petTabBattle"],
            ["cultivate", "petTabCultivate"],
            ["neidan", "petTabNeidan"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${
              tab === id
                ? "bg-violet-500/30 text-violet-100"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* 上阵栏 */}
      <div className="rounded-xl border border-violet-400/30 bg-gradient-to-b from-violet-500/10 to-black/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-violet-100">
            {t("companionBattleBar")}
          </h3>
          <span className="text-[10px] text-white/45">
            {t("companionDeployed", { count: deployed.length, slots: openSlots })}
          </span>
        </div>
        <p className="mb-3 text-[10px] leading-snug text-white/40">
          {t("companionBattleBarHintManual")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_BATTLE_SLOTS }, (_, i) => {
            const pet = (s.battleParty[i] ?? null) as CompanionKind | null;
            const slotOpen = i < openSlots;
            const unlockLv = slotUnlockLevel(i);
            const picking = pickSlot === i;

            if (!slotOpen) {
              return (
                <div
                  key={`slot-${i}`}
                  className="flex flex-col items-center rounded-lg border border-white/8 bg-black/40 px-1 py-2 opacity-60"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sm text-white/25">
                    🔒
                  </span>
                  <p className="mt-1 text-center text-[8px] leading-tight text-white/30">
                    {t("companionSlotLocked", { level: unlockLv })}
                  </p>
                </div>
              );
            }

            const def = pet ? PET_CATALOG.find((x) => x.id === pet) : null;
            return (
              <button
                key={`slot-${i}`}
                type="button"
                onClick={() => {
                  setPickSlot(picking ? null : i);
                  if (pet) setSelected(pet);
                }}
                className={`flex flex-col items-center rounded-lg border px-1 py-2 transition ${
                  picking
                    ? "border-amber-400/70 bg-amber-500/15 ring-1 ring-amber-300/40"
                    : pet
                      ? "border-emerald-400/45 bg-emerald-500/10"
                      : "border-dashed border-white/20 bg-black/25"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-sm font-bold text-white/80">
                  {def?.glyph ?? "+"}
                </span>
                <p className="mt-1 max-w-full truncate text-[9px] font-medium text-white/85">
                  {pet ? allyName(pet, locale) : t("companionSlotEmpty")}
                </p>
                <p className="text-[8px] text-white/40">
                  {pet ? `Lv.${s.companionLevel[pet]}` : t("petTapToSet")}
                </p>
              </button>
            );
          })}
        </div>
        {pickSlot != null && (
          <p className="mt-2 text-[10px] text-amber-200/80">{t("petPickHint")}</p>
        )}
      </div>

      {/* 宠物名册 */}
      <div className="rounded-xl border border-white/10 bg-surface/80 p-3">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-white/70">
          {t("companionRoster")}
        </h3>
        <p className="mb-3 text-[10px] text-white/40">{t("companionBattleHint")}</p>
        <div className="space-y-2">
          {PET_CATALOG.map((def) => {
            const kind = def.id;
            const deployLv = ALLY_DEPLOY_LEVEL[kind];
            const unlocked = s.companionUnlocked[kind];
            const lv = s.companionLevel[kind] ?? 1;
            const inBattle = deployed.includes(kind);
            const canDeploy = s.level >= deployLv;
            const unlockGold = COMPANION_UNLOCK_GOLD[kind];
            const needsGoldUnlock = unlockGold > 0 && !unlocked;
            const levelCost = upgradeCost(s, { type: "companion", kind });
            const canUnlock = needsGoldUnlock && gold >= unlockGold && canDeploy;
            const canLevel =
              unlocked && levelCost != null && gold >= levelCost && lv < s.level;
            const active = selected === kind;

            let status = t("companionLocked");
            if (inBattle) status = t("companionInBattle");
            else if (!canDeploy) status = t("companionNeedLevel", { level: deployLv });
            else if (unlocked) status = t("companionReady");

            return (
              <div
                key={kind}
                className={`rounded-lg border px-3 py-2.5 ${
                  active
                    ? "border-violet-400/50 bg-violet-500/15"
                    : inBattle
                      ? "border-violet-400/30 bg-violet-500/10"
                      : "border-white/10 bg-black/25"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(kind);
                      if (pickSlot != null && unlocked && canDeploy) {
                        onUpgrade({
                          type: "battleSlot",
                          slotIndex: pickSlot,
                          petId: kind,
                        });
                        setPickSlot(null);
                      }
                    }}
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-base font-bold ${
                      inBattle
                        ? "border-violet-300/50 bg-violet-600/20 text-violet-100"
                        : unlocked
                          ? "border-white/20 bg-black/40 text-white/70"
                          : "border-white/10 bg-black/30 text-white/30"
                    }`}
                  >
                    {def.glyph}
                    <span className="text-[7px] font-normal text-white/40">
                      {petQualityLabel(def.quality, locale)}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/90">
                      {allyName(kind, locale)}{" "}
                      <span className="text-violet-200/90">Lv.{lv}</span>
                      <span className="ml-1 text-[9px] text-white/35">
                        /{s.level} · {petRole(def, locale)}
                      </span>
                      {inBattle && (
                        <span className="ml-1 rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] text-emerald-200">
                          {t("companionInBattleTag")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {status} · {t("companionAtk", { atk: calcPetCombatStats(def, Math.min(lv, s.level), s.companionCultivate[kind] ?? 0, s.companionNeidan[kind] ?? {}).atk })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {canUnlock && (
                      <button
                        type="button"
                        onClick={() => onUpgrade({ type: "unlock", kind })}
                        className="rounded border border-gold/40 bg-gold/15 px-2.5 py-1.5 text-[10px] font-medium text-gold"
                      >
                        {t("companionUnlock", { gold: unlockGold })}
                      </button>
                    )}
                    {canLevel && (
                      <button
                        type="button"
                        onClick={() => onUpgrade({ type: "companion", kind })}
                        className="rounded border border-violet-400/40 bg-violet-500/15 px-2.5 py-1.5 text-[10px] font-medium text-violet-100"
                      >
                        {t("petLevelUp", { gold: levelCost })}
                      </button>
                    )}
                    {unlocked && inBattle && (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = s.battleParty.findIndex((x) => x === kind);
                          if (idx >= 0) {
                            onUpgrade({
                              type: "battleSlot",
                              slotIndex: idx,
                              petId: null,
                            });
                          }
                        }}
                        className="rounded border border-white/20 bg-black/30 px-2 py-1.5 text-[10px] text-white/60"
                      >
                        {t("petUnslot")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 修炼 / 内丹 */}
      {tab !== "battle" && selected && selectedDef && selectedStats && s.companionUnlocked[selected] && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <h3 className="text-xs font-semibold text-emerald-100/90">
            {allyName(selected, locale)} ·{" "}
            {tab === "cultivate" ? t("petTabCultivate") : t("petTabNeidan")}
          </h3>
          <p className="mt-1 text-[10px] text-white/45">
            {t("petCombatPreview", {
              atk: selectedStats.atk,
              hp: selectedStats.hp,
              def: selectedStats.def,
            })}
          </p>

          {tab === "cultivate" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-white/70">
                {t("petCultivateLevel", {
                  level: s.companionCultivate[selected] ?? 0,
                  max: MAX_CULTIVATE_LEVEL,
                })}
              </span>
              {(() => {
                const cost = upgradeCost(s, { type: "cultivate", kind: selected });
                const ok = cost != null && gold >= cost;
                return (
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => onUpgrade({ type: "cultivate", kind: selected })}
                    className="rounded border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-medium text-emerald-100 disabled:opacity-40"
                  >
                    {cost != null
                      ? t("petCultivateBtn", { gold: cost })
                      : t("petCultivateMax")}
                  </button>
                );
              })()}
              <p className="w-full text-[9px] text-white/35">{t("petCultivateHint")}</p>
            </div>
          )}

          {tab === "neidan" && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NEIDAN_SLOTS.map((slot) => {
                const lv = s.companionNeidan[selected]?.[slot] ?? 0;
                const cost = upgradeCost(s, {
                  type: "neidan",
                  kind: selected,
                  slot,
                });
                const ok = cost != null && gold >= cost;
                return (
                  <div
                    key={slot}
                    className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2"
                  >
                    <p className="text-[11px] font-medium text-white/85">
                      {neidanLabel(slot)}{" "}
                      <span className="text-white/40">
                        Lv.{lv}/{MAX_NEIDAN_LEVEL}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={!ok}
                      onClick={() =>
                        onUpgrade({ type: "neidan", kind: selected, slot })
                      }
                      className="mt-1.5 w-full rounded border border-sky-400/30 bg-sky-500/10 py-1 text-[10px] text-sky-100 disabled:opacity-40"
                    >
                      {cost != null
                        ? t("petNeidanUp", { gold: cost })
                        : t("petNeidanMax")}
                    </button>
                  </div>
                );
              })}
              <p className="col-span-full text-[9px] text-white/35">{t("petNeidanHint")}</p>
            </div>
          )}
        </div>
      )}

      {tab !== "battle" && (!selected || !s.companionUnlocked[selected ?? "群"]) && (
        <p className="text-center text-[10px] text-white/40">{t("petSelectFirst")}</p>
      )}
    </section>
  );
}
