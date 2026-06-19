"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  listConnectOptions,
  metamaskDappUrl,
  pickConnectConnector,
} from "@/lib/web3/connect-wallet";
import { hasWalletConnect } from "@/lib/web3/config";
import { isOkxBrowser } from "@/lib/web3/providers";

export function WalletButton() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showChoices, setShowChoices] = useState(false);

  const wrongNetwork = isConnected && chainId !== mainnet.id;
  const options = useMemo(() => listConnectOptions(connectors), [connectors]);
  const primary = useMemo(() => pickConnectConnector(connectors), [connectors]);
  const needsMetaMaskApp =
    !primary && typeof window !== "undefined" && !hasWalletConnect;

  const connectorLabel = (id: string, type: string) => {
    if (type === "walletConnect") return t("connectWalletConnect");
    if (id === "io.metamask" || type === "injected") return isOkxBrowser() ? "OKX Wallet" : "MetaMask";
    return id;
  };

  const handleConnect = (connector: NonNullable<typeof primary>) => {
    setShowChoices(false);
    connect({ connector });
  };

  if (!isConnected) {
    return (
      <div className="relative">
        {needsMetaMaskApp ?
          <a
            href={
              typeof window !== "undefined" ?
                metamaskDappUrl(window.location.href)
              : "https://metamask.io/download/"
            }
            className="inline-block rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110"
          >
            {t("openInMetaMask")}
          </a>
        : (
          <button
            type="button"
            disabled={!primary || isPending}
            onClick={() => {
              if (!primary) return;
              if (options.length > 1) {
                setShowChoices((v) => !v);
                return;
              }
              handleConnect(primary);
            }}
            className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {isPending ? t("loading") : t("connectWallet")}
          </button>
        )}

        {showChoices && options.length > 1 && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-white/10 bg-ink p-2 shadow-xl">
            {options.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => handleConnect(connector)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              >
                {connectorLabel(connector.id, connector.type)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="absolute right-0 top-full mt-2 max-w-[220px] text-[10px] text-red-300">
            {t("connectFailed")}
          </p>
        )}
      </div>
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
      <span className="text-xs text-white/50" lang={locale}>
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
