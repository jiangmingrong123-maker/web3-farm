import type { Connector } from "wagmi";
import { detectWalletIds, hasInjectedProvider, isOkxBrowser } from "@/lib/web3/providers";

export { detectWalletIds, hasInjectedProvider, isOkxBrowser };

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function metamaskDappUrl(currentUrl: string): string {
  return `https://metamask.app.link/dapp/${encodeURIComponent(
    currentUrl.replace(/^https?:\/\//, ""),
  )}`;
}

export function okxDappUrl(currentUrl: string): string {
  return `https://www.okx.com/web3/dapp/url?dappUrl=${encodeURIComponent(currentUrl)}`;
}

const CONNECTOR_LABELS: Record<string, string> = {
  okxWallet: "OKX Wallet",
  metaMask: "MetaMask",
  metaMaskSDK: "MetaMask",
  coinbaseWallet: "Coinbase Wallet",
  coinbaseWalletSDK: "Coinbase Wallet",
  trust: "Trust Wallet",
  rabby: "Rabby",
  tokenPocket: "TokenPocket",
  imToken: "imToken",
  bitget: "Bitget Wallet",
  injected: "Browser Wallet",
  walletConnect: "WalletConnect",
};

export function connectorLabel(connector: Connector): string {
  return CONNECTOR_LABELS[connector.id] ?? connector.name ?? connector.id;
}

function rankConnector(connector: Connector, detected: string[]): number {
  const idx = detected.indexOf(connector.id);
  if (idx >= 0) return idx;
  if (connector.type === "walletConnect") return 50;
  if (connector.id === "injected") return 60;
  return 40;
}

/** Wallets detected in this browser first, then WalletConnect, then others. */
export function listConnectOptions(connectors: readonly Connector[]): Connector[] {
  const detected = detectWalletIds();
  const out: Connector[] = [];

  const named = connectors.filter(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const generic = connectors.find((c) => c.type === "injected" && c.id === "injected");
  const walletConnect = connectors.find((c) => c.type === "walletConnect");

  if (detected.length > 0) {
    for (const id of detected) {
      const match = named.find((c) => c.id === id);
      if (match && !out.includes(match)) out.push(match);
    }
  } else {
    for (const c of named) {
      if (!out.includes(c)) out.push(c);
    }
  }

  if (walletConnect && !out.includes(walletConnect)) out.push(walletConnect);
  if (generic && detected.includes("injected") && !out.includes(generic)) {
    out.push(generic);
  }

  return out.sort((a, b) => rankConnector(a, detected) - rankConnector(b, detected));
}

export function pickConnectConnector(connectors: readonly Connector[]): Connector | null {
  const options = listConnectOptions(connectors);
  return options[0] ?? null;
}
