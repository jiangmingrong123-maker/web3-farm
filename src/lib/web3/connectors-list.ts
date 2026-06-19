import { injected, type CreateConnectorFn } from "wagmi";
import type { EIP1193Provider } from "viem";

type EthProvider = EIP1193Provider & {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isRabby?: boolean;
  isTokenPocket?: boolean;
  isImToken?: boolean;
  isBitKeep?: boolean;
  isBraveWallet?: boolean;
};

type AppWindow = Window & {
  okxwallet?: EIP1193Provider;
  ethereum?: EthProvider;
};

function win(): AppWindow | undefined {
  if (typeof window === "undefined") return undefined;
  return window as AppWindow;
}

function eth(): EthProvider | undefined {
  return win()?.ethereum;
}

function walletTarget(
  id: string,
  name: string,
  resolve: () => EIP1193Provider | undefined,
): CreateConnectorFn {
  return injected({
    target() {
      const provider = resolve();
      if (!provider) return undefined;
      return { id, name, provider };
    },
    shimDisconnect: true,
  });
}

/** Dedicated connectors — MetaMask target excludes OKX/Rabby/etc. */
export const metaMaskConnector = injected({ target: "metaMask", shimDisconnect: true });
export const coinbaseConnector = injected({ target: "coinbaseWallet", shimDisconnect: true });

export const okxConnector = walletTarget("okxWallet", "OKX Wallet", () => {
  const w = win();
  if (w?.okxwallet) return w.okxwallet;
  const e = eth();
  if (e?.isOkxWallet || e?.isOKExWallet) return e;
  return undefined;
});

export const trustConnector = walletTarget("trust", "Trust Wallet", () => {
  const e = eth();
  if (e?.isTrust || e?.isTrustWallet) return e;
  return undefined;
});

export const rabbyConnector = walletTarget("rabby", "Rabby", () => {
  const e = eth();
  if (e?.isRabby) return e;
  return undefined;
});

export const tokenPocketConnector = walletTarget("tokenPocket", "TokenPocket", () => {
  const e = eth();
  if (e?.isTokenPocket) return e;
  return undefined;
});

export const imTokenConnector = walletTarget("imToken", "imToken", () => {
  const e = eth();
  if (e?.isImToken) return e;
  return undefined;
});

export const bitgetConnector = walletTarget("bitget", "Bitget Wallet", () => {
  const e = eth();
  if (e?.isBitKeep) return e;
  return undefined;
});

/** Generic fallback for other injected browsers. */
export const genericInjectedConnector = injected({ shimDisconnect: true });

export const NAMED_WALLET_CONNECTORS: CreateConnectorFn[] = [
  okxConnector,
  metaMaskConnector,
  coinbaseConnector,
  trustConnector,
  rabbyConnector,
  tokenPocketConnector,
  imTokenConnector,
  bitgetConnector,
];
