import { DEFAULT_BASE_POINTS_PER_DAY } from "@/config/tiers";

export function computeDailyPoints(
  multiplier: number,
  basePointsPerDay: number | null = DEFAULT_BASE_POINTS_PER_DAY,
): number | null {
  if (basePointsPerDay == null) return null;
  return Math.round(basePointsPerDay * multiplier * 100) / 100;
}

export function formatPoints(value: number | null, locale: string): string {
  if (value == null) {
    return locale === "zh" ? "待定" : "TBD";
  }
  return value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 2,
  });
}
