/** Adaptive USD formatting for sub-cent meme coins (FLOKI, TOKEN, etc.). */
export function usdPriceDecimals(price: number): number {
  const abs = Math.abs(price);
  if (!Number.isFinite(abs) || abs === 0) return 2;
  if (abs >= 1000) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function formatUsdPrice(price: number, locale: string): string {
  const digits = usdPriceDecimals(price);
  return price.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatUsdPriceLabel(price: number, locale: string): string {
  return `$${formatUsdPrice(price, locale)}`;
}

/** 账户总资产 / 盈亏等 USD 金额（固定 2 位小数） */
export function formatUsdAmount(amount: number, locale: string, fractionDigits = 2): string {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatUsdEquityLabel(equity: number, locale: string): string {
  return `$${formatUsdAmount(equity, locale)}`;
}

export function formatUsdPnlLabel(pnl: number, locale: string): string {
  const sign = pnl >= 0 ? "+" : "-";
  return `${sign}$${formatUsdAmount(Math.abs(pnl), locale)}`;
}
