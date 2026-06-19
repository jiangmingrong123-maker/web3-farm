import type { Connector } from "wagmi";

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function hasInjectedProvider(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Window & { okxwallet?: unknown; ethereum?: unknown }).okxwallet ??
      (window as Window & { ethereum?: unknown }).ethereum,
  );
}

export function metamaskDappUrl(currentUrl: string): string {
  return `https://metamask.app.link/dapp/${encodeURIComponent(
    currentUrl.replace(/^https?:\/\//, ""),
  )}`;
}

/** Pick injected on desktop; WalletConnect on mobile when no in-app browser. */
export function pickConnectConnector(connectors: readonly Connector[]): Connector | null {
  const injected = connectors.find((c) => c.type === "injected");
  const walletConnect = connectors.find((c) => c.type === "walletConnect");

  if (isMobileBrowser()) {
    if (hasInjectedProvider() && injected) return injected;
    if (walletConnect) return walletConnect;
    return injected ?? walletConnect ?? null;
  }

  if (injected && hasInjectedProvider()) return injected;
  return injected ?? walletConnect ?? null;
}

export function listConnectOptions(connectors: readonly Connector[]): Connector[] {
  const out: Connector[] = [];
  const injected = connectors.find((c) => c.type === "injected");
  const walletConnect = connectors.find((c) => c.type === "walletConnect");
  if (injected && hasInjectedProvider()) out.push(injected);
  if (walletConnect) out.push(walletConnect);
  if (out.length === 0 && injected) out.push(injected);
  return out;
}
