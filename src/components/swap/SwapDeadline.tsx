"use client";

import { useTranslations } from "next-intl";

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface SwapDeadlineProps {
  remainingSec: number;
  expired: boolean;
  myDeposited: boolean;
}

export function SwapDeadline({ remainingSec, expired, myDeposited }: SwapDeadlineProps) {
  const t = useTranslations("swap");

  if (expired) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-center">
        <p className="text-sm font-semibold text-red-300">{t("deadlineExpired")}</p>
        {myDeposited && (
          <p className="mt-2 text-xs text-white/50">{t("deadlineExpiredHint")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 text-center">
      <p className="text-xs text-amber-200/70">{t("deadlineLabel")}</p>
      <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-wider text-amber-300">
        {formatCountdown(remainingSec)}
      </p>
      <p className="mt-2 text-xs text-white/45">
        {myDeposited ? t("deadlineWaitingOther") : t("deadlineWaitingYou")}
      </p>
    </div>
  );
}
