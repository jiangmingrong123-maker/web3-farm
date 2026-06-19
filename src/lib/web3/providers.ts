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
};

type AppWindow = Window & {
  okxwallet?: EIP1193Provider;
  ethereum?: EthProvider;
};

function appWindow(): AppWindow | undefined {
  if (typeof window === "undefined") return undefined;
  return window as AppWindow;
}

/** Prefer OKX provider when inside OKX in-app browser. */
export function getInjectedProvider(): EIP1193Provider | undefined {
  const w = appWindow();
  if (!w) return undefined;
  if (w.okxwallet) return w.okxwallet;
  return w.ethereum;
}

export function isOkxBrowser(): boolean {
  const w = appWindow();
  if (w?.okxwallet) return true;
  const e = w?.ethereum;
  return Boolean(e?.isOkxWallet || e?.isOKExWallet);
}

export function isMetaMaskBrowser(): boolean {
  const e = appWindow()?.ethereum;
  if (!e?.isMetaMask) return false;
  return !e.isOkxWallet && !e.isOKExWallet && !e.isRabby;
}

export function hasInjectedProvider(): boolean {
  return Boolean(getInjectedProvider());
}

/** Connector ids likely available in this browser (for UI filtering). */
export function detectWalletIds(): string[] {
  const w = appWindow();
  if (!w) return [];
  const ids: string[] = [];
  const e = w.ethereum;

  if (w.okxwallet || e?.isOkxWallet || e?.isOKExWallet) ids.push("okxWallet");
  if (e?.isMetaMask && !e.isOkxWallet && !e.isOKExWallet && !e.isRabby) ids.push("metaMask");
  if (e?.isCoinbaseWallet) ids.push("coinbaseWallet");
  if (e?.isTrust || e?.isTrustWallet) ids.push("trust");
  if (e?.isRabby) ids.push("rabby");
  if (e?.isTokenPocket) ids.push("tokenPocket");
  if (e?.isImToken) ids.push("imToken");
  if (e?.isBitKeep) ids.push("bitget");

  if (ids.length === 0 && e) ids.push("injected");
  return Array.from(new Set(ids));
}
