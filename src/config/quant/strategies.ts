export type StrategyId = "ma_cross" | "rsi_revert" | "grid";

export type StrategyParamDef = {
  key: string;
  labelZh: string;
  labelEn: string;
  default: number;
  min: number;
  max: number;
};

export type StrategyPreset = {
  id: string;
  nameZh: string;
  nameEn: string;
  hintZh: string;
  hintEn: string;
  values: Record<string, number>;
};

export type StrategyDef = {
  id: StrategyId;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  /** 面向用户的详细说明（快捷页展示） */
  introZh: string;
  introEn: string;
  suitableZh: string;
  suitableEn: string;
  params: StrategyParamDef[];
  /** 快捷页可选的预设参数方案 */
  presets: StrategyPreset[];
};

export const QUANT_STRATEGIES: StrategyDef[] = [
  {
    id: "ma_cross",
    nameZh: "双均线交叉",
    nameEn: "MA Crossover",
    descZh: "规则模板：快线上穿慢线记为买入条件，下穿为卖出条件。参数由用户自行设定。",
    descEn: "Template: buy when fast MA crosses above slow; sell on cross below. User-defined params.",
    introZh:
      "用两条移动平均线（快线、慢线）判断趋势。快线上穿慢线 → 满足买入条件；快线下穿慢线 → 满足卖出条件。逻辑简单，适合趋势明显的行情；横盘震荡时可能频繁假信号。",
    introEn:
      "Uses fast and slow moving averages. Golden cross → buy condition; death cross → sell condition. Simple and trend-friendly; choppy markets may whipsaw.",
    suitableZh: "适合：趋势币、波动适中 · 默认快 7 / 慢 25",
    suitableEn: "Best for: trending markets · Defaults: fast 7 / slow 25",
    params: [
      { key: "fast", labelZh: "快线周期", labelEn: "Fast MA", default: 7, min: 3, max: 30 },
      { key: "slow", labelZh: "慢线周期", labelEn: "Slow MA", default: 25, min: 10, max: 60 },
    ],
    presets: [
      {
        id: "short",
        nameZh: "短线",
        nameEn: "Short",
        hintZh: "反应快，信号多，震荡市易假突破",
        hintEn: "Faster signals; more whipsaws in chop",
        values: { fast: 5, slow: 15 },
      },
      {
        id: "standard",
        nameZh: "标准",
        nameEn: "Standard",
        hintZh: "均衡默认，适合多数趋势币",
        hintEn: "Balanced default for trending pairs",
        values: { fast: 7, slow: 25 },
      },
      {
        id: "long",
        nameZh: "长线",
        nameEn: "Long",
        hintZh: "过滤噪音，信号少但更稳",
        hintEn: "Fewer but smoother signals",
        values: { fast: 12, slow: 50 },
      },
    ],
  },
  {
    id: "rsi_revert",
    nameZh: "RSI 均值回归",
    nameEn: "RSI Mean Reversion",
    descZh: "规则模板：RSI 低于下界为买入条件，高于上界为卖出条件。参数由用户自行设定。",
    descEn: "Template: buy when RSI below lower band; sell above upper. User-defined params.",
    introZh:
      "RSI 衡量涨跌幅强弱。低于超卖线（默认 30）→ 视为跌过头，满足买入条件；高于超买线（默认 70）→ 视为涨过头，满足卖出条件。适合区间振荡；强趋势里可能「越买越跌 / 越卖越涨」。",
    introEn:
      "RSI measures momentum. Below oversold (default 30) → buy condition; above overbought (default 70) → sell. Works in ranges; strong trends can run against you.",
    suitableZh: "适合：箱体震荡 · 默认周期 14，超卖 30 / 超买 70",
    suitableEn: "Best for: range-bound · Default: period 14, OS 30 / OB 70",
    params: [
      { key: "period", labelZh: "RSI 周期", labelEn: "RSI Period", default: 14, min: 5, max: 30 },
      { key: "low", labelZh: "超卖线", labelEn: "Oversold", default: 30, min: 10, max: 40 },
      { key: "high", labelZh: "超买线", labelEn: "Overbought", default: 70, min: 60, max: 90 },
    ],
    presets: [
      {
        id: "sensitive",
        nameZh: "灵敏",
        nameEn: "Sensitive",
        hintZh: "更早触发，适合窄幅箱体",
        hintEn: "Earlier triggers; tight ranges",
        values: { period: 9, low: 35, high: 65 },
      },
      {
        id: "standard",
        nameZh: "标准",
        nameEn: "Standard",
        hintZh: "经典 14 / 30 / 70",
        hintEn: "Classic 14 / 30 / 70",
        values: { period: 14, low: 30, high: 70 },
      },
      {
        id: "conservative",
        nameZh: "保守",
        nameEn: "Conservative",
        hintZh: "门槛更高，减少频繁交易",
        hintEn: "Stricter bands; fewer trades",
        values: { period: 21, low: 25, high: 75 },
      },
    ],
  },
  {
    id: "grid",
    nameZh: "网格交易",
    nameEn: "Grid Trading",
    descZh: "规则模板：在价格区间内等距触发买卖条件。参数由用户自行设定。",
    descEn: "Template: buy/sell triggers at equal price intervals. User-defined params.",
    introZh:
      "以当前价为中心划一个上下区间，切成多档网格。价格跌到下一格 → 买入条件；涨到上一格 → 卖出条件。适合横盘来回波动；单边大涨大跌可能满仓或空仓踏空。",
    introEn:
      "Splits a price band around spot into grids. Price hits lower grid → buy; upper grid → sell. Good for sideways chop; breakouts can leave you fully in or out.",
    suitableZh: "适合：震荡市 · 默认 10 格、区间 ±8%",
    suitableEn: "Best for: sideways markets · Default: 10 grids, ±8% band",
    params: [
      { key: "grids", labelZh: "网格数", labelEn: "Grid Count", default: 10, min: 4, max: 20 },
      { key: "rangePct", labelZh: "区间幅度 %", labelEn: "Range %", default: 8, min: 3, max: 20 },
    ],
    presets: [
      {
        id: "tight",
        nameZh: "密网格",
        nameEn: "Tight",
        hintZh: "格子多、区间窄，适合小幅震荡",
        hintEn: "More grids, narrow band; small swings",
        values: { grids: 15, rangePct: 5 },
      },
      {
        id: "standard",
        nameZh: "标准",
        nameEn: "Standard",
        hintZh: "10 格 ±8%，通用默认",
        hintEn: "10 grids ±8%; general default",
        values: { grids: 10, rangePct: 8 },
      },
      {
        id: "wide",
        nameZh: "宽网格",
        nameEn: "Wide",
        hintZh: "格子少、区间宽，波动大时用",
        hintEn: "Fewer grids, wider band; high volatility",
        values: { grids: 6, rangePct: 15 },
      },
    ],
  },
];

export function getStrategy(id: StrategyId): StrategyDef {
  return QUANT_STRATEGIES.find((s) => s.id === id) ?? QUANT_STRATEGIES[0]!;
}

export function defaultParams(strategyId: StrategyId): Record<string, number> {
  const s = getStrategy(strategyId);
  const standard = s.presets.find((p) => p.id === "standard") ?? s.presets[0];
  if (standard) return { ...standard.values };
  return Object.fromEntries(s.params.map((p) => [p.key, p.default]));
}

export function matchPreset(strategyId: StrategyId, params: Record<string, number>): string | null {
  const s = getStrategy(strategyId);
  for (const preset of s.presets) {
    const match = s.params.every((p) => (params[p.key] ?? p.default) === preset.values[p.key]);
    if (match) return preset.id;
  }
  return null;
}

export function formatParamsSummary(
  strategyId: StrategyId,
  params: Record<string, number>,
  zh: boolean,
): string {
  const s = getStrategy(strategyId);
  return s.params
    .map((p) => {
      const v = params[p.key] ?? p.default;
      return `${zh ? p.labelZh : p.labelEn} ${v}`;
    })
    .join(zh ? " · " : " · ");
}
