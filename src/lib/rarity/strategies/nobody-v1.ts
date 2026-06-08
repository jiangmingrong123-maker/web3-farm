import {
  TOP_TIER_MAX_AVG_PERCENT,
  TIER_MULTIPLIERS,
  type TierCode,
} from "@/config/tiers";
import type {
  NftAttribute,
  RarityEvaluationInput,
  RarityEvaluationResult,
  RarityStrategy,
  TraitRarityStat,
} from "../types";

export const NOBODY_STANDARD_TRAITS = [
  "background",
  "body",
  "earrings",
  "face",
  "glasses",
  "handheld",
  "head",
  "skin",
] as const;

const TIER_FLAG = "special";

function normalizeKey(traitType: string, value: string | number): string {
  return `${traitType.toLowerCase().trim()}::${String(value).trim()}`;
}

function isValidValue(value: string | number): boolean {
  const s = String(value).trim().toLowerCase();
  return s.length > 0 && s !== "none" && s !== "n/a" && s !== "null";
}

function getAttribute(
  attributes: NftAttribute[],
  traitType: string,
): NftAttribute | undefined {
  const key = traitType.toLowerCase();
  return attributes.find((a) => a.trait_type.toLowerCase() === key);
}

function hasSpecialTrait(attributes: NftAttribute[]): boolean {
  const attr = getAttribute(attributes, TIER_FLAG);
  return attr != null && isValidValue(attr.value);
}

function countStandardTraits(attributes: NftAttribute[]): {
  count: number;
  matched: string[];
} {
  const matched: string[] = [];
  for (const trait of NOBODY_STANDARD_TRAITS) {
    const attr = getAttribute(attributes, trait);
    if (attr && isValidValue(attr.value)) {
      matched.push(trait);
    }
  }
  return { count: matched.length, matched };
}

function averagePercent(
  attributes: NftAttribute[],
  matchedTraits: string[],
  traitStats: Map<string, TraitRarityStat>,
): number | null {
  if (matchedTraits.length === 0) return null;

  let sum = 0;
  let found = 0;
  for (const trait of matchedTraits) {
    const attr = getAttribute(attributes, trait);
    if (!attr) continue;
    const stat = traitStats.get(normalizeKey(trait, attr.value));
    if (stat) {
      sum += stat.percent;
      found += 1;
    }
  }

  return found > 0 ? sum / found : null;
}

function resolveTier(
  hasSpecial: boolean,
  standardCount: number,
  avgPercent: number | null,
): TierCode {
  if (hasSpecial) return "SPECIAL";

  if (
    standardCount >= 8 &&
    avgPercent != null &&
    avgPercent <= TOP_TIER_MAX_AVG_PERCENT
  ) {
    return "TOP";
  }

  if (standardCount >= 8) return "FULL";
  if (standardCount === 7) return "RICH";
  if (standardCount === 6) return "BASIC";
  return "MINIMUM";
}

export function evaluateNobodyV1(
  input: RarityEvaluationInput,
): RarityEvaluationResult {
  if (input.overrideTier) {
    const tier = input.overrideTier;
    return {
      tier,
      multiplier: input.overrideMultiplier ?? TIER_MULTIPLIERS[tier],
      traitCount: input.attributes.length,
      avgPercent: null,
      hasSpecial: hasSpecialTrait(input.attributes),
      details: { standardTraitCount: 0, matchedTraits: [] },
    };
  }

  const hasSpecial = hasSpecialTrait(input.attributes);
  const { count: standardCount, matched } = countStandardTraits(
    input.attributes,
  );
  const avg = averagePercent(input.attributes, matched, input.traitStats);
  const tier = resolveTier(hasSpecial, standardCount, avg);
  const multiplier = input.overrideMultiplier ?? TIER_MULTIPLIERS[tier];

  return {
    tier,
    multiplier,
    traitCount: input.attributes.length,
    avgPercent: avg,
    hasSpecial,
    details: {
      standardTraitCount: standardCount,
      matchedTraits: matched,
    },
  };
}

export const nobodyV1Strategy: RarityStrategy = {
  id: "nobody_v1",
  evaluate: evaluateNobodyV1,
};
