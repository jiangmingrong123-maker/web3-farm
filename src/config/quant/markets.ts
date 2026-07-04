export type MarketInterval = "1h" | "4h" | "1d";

export type QuantChain = "ethereum" | "bsc";

/** 链上 DEX 池（GeckoTerminal K 线 + DexScreener 现价，可选 Binance 备用） */
export type DexPool = {
  id: string;
  label: string;
  chain: QuantChain;
  geckoNetwork: "eth" | "bsc";
  dex: string;
  poolAddress: string;
  baseSymbol: string;
  quoteSymbol: string;
  /** CEX 备用 K 线 / 现价 */
  binanceSymbol?: string;
  /** 链上池流动性不足时，K 线与现价均走 Binance */
  priceFromBinance?: boolean;
};

export const QUANT_CHAINS: { id: QuantChain; labelZh: string; labelEn: string }[] = [
  { id: "ethereum", labelZh: "以太坊", labelEn: "Ethereum" },
  { id: "bsc", labelZh: "BNB 链", labelEn: "BSC" },
];

export const QUANT_POOLS: DexPool[] = [
  // ── Ethereum ──
  {
    id: "weth-usdc",
    label: "WETH / USDC",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "uniswap_v3",
    poolAddress: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    baseSymbol: "WETH",
    quoteSymbol: "USDC",
    binanceSymbol: "ETHUSDT",
  },
  {
    id: "wbtc-usdc",
    label: "WBTC / USDC",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "uniswap_v3",
    poolAddress: "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",
    baseSymbol: "WBTC",
    quoteSymbol: "USDC",
    binanceSymbol: "BTCUSDT",
  },
  {
    id: "link-usdc",
    label: "LINK / USDC",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "uniswap_v3",
    poolAddress: "0x50ae33c238824aa1937d5d9f1766c487bca39b548f8d957994e8357eeeca3280",
    baseSymbol: "LINK",
    quoteSymbol: "USDC",
    binanceSymbol: "LINKUSDT",
  },
  {
    id: "uni-usdc",
    label: "UNI / USDC",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "uniswap_v3",
    poolAddress: "0x9a5c1d2f4a7a7962a63259de6fcc1afb1d0aa1abdf5d19c23d22fd78953c5167",
    baseSymbol: "UNI",
    quoteSymbol: "USDC",
    binanceSymbol: "UNIUSDT",
  },
  {
    id: "eth-floki",
    label: "FLOKI / USDT",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "binance_ref",
    poolAddress: "0x231d9e7181E8479A8B40930961e93E7ed798542C",
    baseSymbol: "FLOKI",
    quoteSymbol: "USDT",
    binanceSymbol: "FLOKIUSDT",
    priceFromBinance: true,
  },
  {
    id: "eth-token",
    label: "TOKEN / WETH",
    chain: "ethereum",
    geckoNetwork: "eth",
    dex: "uniswap_v2",
    poolAddress: "0xC7e6B676bfC73Ae40bcC4577F22aab1682C691C6",
    baseSymbol: "TOKEN",
    quoteSymbol: "WETH",
  },
  // ── BNB Chain（更多币种后续扩展）──
  {
    id: "bsc-floki",
    label: "FLOKI / WBNB",
    chain: "bsc",
    geckoNetwork: "bsc",
    dex: "pancakeswap_v2",
    poolAddress: "0x231d9e7181E8479A8B40930961e93E7ed798542C",
    baseSymbol: "FLOKI",
    quoteSymbol: "WBNB",
    binanceSymbol: "FLOKIUSDT",
  },
  {
    id: "bsc-token",
    label: "TOKEN / WBNB",
    chain: "bsc",
    geckoNetwork: "bsc",
    dex: "pancakeswap_v2",
    poolAddress: "0x05616b7B6Da03Fb4c773B76663816b360ccAEdE4",
    baseSymbol: "TOKEN",
    quoteSymbol: "WBNB",
  },
];

export const QUANT_INTERVALS: { id: MarketInterval; labelZh: string; labelEn: string }[] = [
  { id: "1h", labelZh: "1 小时", labelEn: "1H" },
  { id: "4h", labelZh: "4 小时", labelEn: "4H" },
  { id: "1d", labelZh: "日线", labelEn: "1D" },
];

export function poolsForChain(chain: QuantChain): DexPool[] {
  return QUANT_POOLS.filter((p) => p.chain === chain);
}

export function getPool(id: string): DexPool {
  return QUANT_POOLS.find((m) => m.id === id) ?? QUANT_POOLS[0]!;
}

/** @deprecated use QUANT_POOLS */
export const QUANT_MARKETS = QUANT_POOLS.map((p) => ({
  id: p.id,
  label: p.label,
  binance: p.poolAddress,
}));

export function getMarket(id: string) {
  const p = getPool(id);
  return { id: p.id, label: p.label, binance: p.poolAddress };
}
