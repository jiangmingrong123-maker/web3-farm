/** Server-side pool config — keep in sync with src/config/quant/markets.ts */
export type QuantChain = "ethereum" | "bsc";

export type DexPool = {
  id: string;
  chain: QuantChain;
  geckoNetwork: "eth" | "bsc";
  poolAddress: string;
  baseSymbol: string;
  quoteSymbol: string;
  binanceSymbol?: string;
  priceFromBinance?: boolean;
};

export const QUANT_POOLS: DexPool[] = [
  {
    id: "weth-usdc",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    baseSymbol: "WETH",
    quoteSymbol: "USDC",
    binanceSymbol: "ETHUSDT",
  },
  {
    id: "wbtc-usdc",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",
    baseSymbol: "WBTC",
    quoteSymbol: "USDC",
    binanceSymbol: "BTCUSDT",
  },
  {
    id: "link-usdc",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0x50ae33c238824aa1937d5d9f1766c487bca39b548f8d957994e8357eeeca3280",
    baseSymbol: "LINK",
    quoteSymbol: "USDC",
    binanceSymbol: "LINKUSDT",
  },
  {
    id: "uni-usdc",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0x9a5c1d2f4a7a7962a63259de6fcc1afb1d0aa1abdf5d19c23d22fd78953c5167",
    baseSymbol: "UNI",
    quoteSymbol: "USDC",
    binanceSymbol: "UNIUSDT",
  },
  {
    id: "eth-floki",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0x231d9e7181E8479A8B40930961e93E7ed798542C",
    baseSymbol: "FLOKI",
    quoteSymbol: "USDT",
    binanceSymbol: "FLOKIUSDT",
    priceFromBinance: true,
  },
  {
    id: "eth-token",
    chain: "ethereum",
    geckoNetwork: "eth",
    poolAddress: "0xC7e6B676bfC73Ae40bcC4577F22aab1682C691C6",
    baseSymbol: "TOKEN",
    quoteSymbol: "WETH",
  },
  {
    id: "bsc-floki",
    chain: "bsc",
    geckoNetwork: "bsc",
    poolAddress: "0x231d9e7181E8479A8B40930961e93E7ed798542C",
    baseSymbol: "FLOKI",
    quoteSymbol: "WBNB",
    binanceSymbol: "FLOKIUSDT",
  },
  {
    id: "bsc-token",
    chain: "bsc",
    geckoNetwork: "bsc",
    poolAddress: "0x05616b7B6Da03Fb4c773B76663816b360ccAEdE4",
    baseSymbol: "TOKEN",
    quoteSymbol: "WBNB",
  },
];

export function getPool(id: string): DexPool {
  return QUANT_POOLS.find((p) => p.id === id) ?? QUANT_POOLS[0]!;
}

export type StrategyId = "ma_cross" | "rsi_revert" | "grid";
