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
