"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";

export function WalletButton() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== mainnet.id;
  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={!injectedConnector || isPending}
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? t("loading") : t("connectWallet")}
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: mainnet.id })}
        className="rounded-full border border-amber-400/60 px-5 py-2 text-sm font-semibold text-amber-200"
      >
        {t("switchNetwork")}
      </button>
    );
  }

  const short = `${address?.slice(0, 6)}…${address?.slice(-4)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-white/50 sm:inline" lang={locale}>
        {short}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-white/30"
      >
        {t("disconnect")}
      </button>
    </div>
  );
}
