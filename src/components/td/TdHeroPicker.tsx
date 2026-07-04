"use client";

import { useTranslations } from "next-intl";
import {
  PROTAGONISTS,
  protagonistName,
  type ProtagonistId,
} from "@/config/td/protagonists";

const HERO_COLORS: Record<ProtagonistId, string> = {
  goku: "from-orange-600 to-amber-500",
  vegeta: "from-blue-700 to-indigo-600",
  android18: "from-yellow-500 to-amber-400",
  tien: "from-emerald-700 to-teal-600",
  launch: "from-rose-500 to-pink-400",
};

const HERO_INITIAL: Record<ProtagonistId, string> = {
  goku: "明",
  vegeta: "赛",
  android18: "18",
  tien: "眼",
  launch: "琪",
};

type Props = {
  selected: ProtagonistId;
  locale: string;
  onSelect: (id: ProtagonistId) => void;
};

export function TdHeroPicker({ selected, locale, onSelect }: Props) {
  const t = useTranslations("td");

  return (
    <section className="rounded-xl border border-white/10 bg-surface p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        {t("protagonistTitle")}
      </h3>
      <p className="mb-3 text-[11px] text-white/35">{t("protagonistHint")}</p>
      <div className="grid grid-cols-5 gap-2">
        {PROTAGONISTS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`flex flex-col items-center rounded-lg border px-1 py-2 transition-colors ${
                active
                  ? "border-gold bg-gold/15 ring-1 ring-gold/40"
                  : "border-white/10 bg-black/20 hover:border-white/25"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br text-sm font-bold text-white shadow-inner ${HERO_COLORS[p.id]}`}
              >
                {HERO_INITIAL[p.id]}
              </div>
              <span className="mt-1 max-w-full truncate text-[10px] text-white/80">
                {protagonistName(p.id, locale)}
              </span>
              <span className="text-[8px] text-white/35">
                {p.gender === "female" ? t("genderFemale") : t("genderMale")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ProtagonistAvatar({
  id,
  locale,
  level,
}: {
  id: ProtagonistId;
  locale: string;
  level: number;
}) {
  const name = protagonistName(id, locale);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-md border border-emerald-600/60 bg-gradient-to-br text-lg font-bold text-white shadow-inner ring-1 ring-emerald-900/40 ${HERO_COLORS[id]}`}
      >
        {HERO_INITIAL[id]}
      </div>
      <p className="mt-1 max-w-[72px] truncate text-center text-[9px] text-white/70">
        {name}
      </p>
      <p className="text-[10px] font-bold text-gold">Lv.{level}</p>
    </div>
  );
}
