export type StrategyId = "ma_cross" | "rsi_revert" | "grid";

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
  params: { key: string; labelZh: string; labelEn: string; default: number; min: number; max: number }[];
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
  },
];

export function getStrategy(id: StrategyId): StrategyDef {
  return QUANT_STRATEGIES.find((s) => s.id === id) ?? QUANT_STRATEGIES[0]!;
}
