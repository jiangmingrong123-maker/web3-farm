/** Prefer OKX in-app browser provider over generic window.ethereum. */
export function getInjectedProvider(): unknown | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    okxwallet?: { request?: (...args: unknown[]) => Promise<unknown> };
    ethereum?: unknown;
  };
  if (w.okxwallet?.request) return w.okxwallet;
  return w.ethereum;
}

export function isOkxBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    okxwallet?: { request?: (...args: unknown[]) => Promise<unknown> };
  };
  return Boolean(w.okxwallet?.request);
}
