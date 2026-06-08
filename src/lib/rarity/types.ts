import type { TierCode } from "@/config/tiers";

export type RarityStrategyId = "nobody_v1";

export interface NftAttribute {
  trait_type: string;
  value: string | number;
}

export interface TraitRarityStat {
  trait_type: string;
  trait_value: string;
  percent: number;
  token_count?: number;
}

export interface RarityEvaluationInput {
  attributes: NftAttribute[];
  traitStats: Map<string, TraitRarityStat>;
  overrideTier?: TierCode | null;
  overrideMultiplier?: number | null;
}

export interface RarityEvaluationResult {
  tier: TierCode;
  multiplier: number;
  traitCount: number;
  avgPercent: number | null;
  hasSpecial: boolean;
  details: {
    standardTraitCount: number;
    matchedTraits: string[];
  };
}

export interface RarityStrategy {
  id: RarityStrategyId;
  evaluate(input: RarityEvaluationInput): RarityEvaluationResult;
}
