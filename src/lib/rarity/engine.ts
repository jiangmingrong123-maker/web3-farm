import type { RarityStrategyId } from "./types";
import { nobodyV1Strategy } from "./strategies/nobody-v1";
import type { RarityEvaluationInput, RarityEvaluationResult } from "./types";

const strategies = {
  nobody_v1: nobodyV1Strategy,
} as const;

export function evaluateRarity(
  strategyId: RarityStrategyId,
  input: RarityEvaluationInput,
): RarityEvaluationResult {
  const strategy = strategies[strategyId];
  if (!strategy) {
    throw new Error(`Unknown rarity strategy: ${strategyId}`);
  }
  return strategy.evaluate(input);
}
