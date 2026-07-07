"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  connectorLabel,
  hasInjectedProvider,
  isMobileBrowser,
  listConnectOptions,
  metamaskDappUrl,
  okxDappUrl,
  pickConnectConnector,
} from "@/lib/web3/connect-wallet";
import { hasWalletConnect } from "@/lib/web3/config";

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
  const pageUrl = typeof window !== "undefined" ? window.location.href : SITE_FALLBACK;
  const isMobile = typeof window !== "undefined" && isMobileBrowser();
  const inWalletBrowser = typeof window !== "undefined" && hasInjectedProvider();
  const showMobileDappLinks = isMobile && !inWalletBrowser;

  if (!isConnected) {
    return (
      <div className="relative max-w-[min(100%,280px)]">
        {showMobileDappLinks ?
          <div className="flex flex-col items-end gap-2">
            <p className="text-right text-[10px] leading-snug text-white/45">{t("mobileWalletHint")}</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href={okxDappUrl(pageUrl)}
                className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/90 hover:border-white/35"
              >
                {t("openInOkx")}
              </a>
              <a
                href={metamaskDappUrl(pageUrl)}
                className="rounded-full bg-gold px-3 py-2 text-xs font-bold text-ink hover:brightness-110"
              >
                {t("openInMetaMask")}
              </a>
            </div>
            {hasWalletConnect && options.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowChoices((v) => !v)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/75"
              >
                {t("connectWalletConnect")}
              </button>
            )}
          </div>
        : (
          <button
            type="button"
            disabled={!primary || isPending}
            onClick={() => {
              if (!primary) return;
              if (isMobile || options.length > 1) {
                setShowChoices((v) => !v);
                return;
              }
              setShowChoices(false);
              connect({ connector: primary });
            }}
            className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {isPending ? t("loading") : t("connectWallet")}
          </button>
        )}

        {showChoices && options.length > 0 && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-white/10 bg-ink p-2 shadow-xl">
            {options.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowChoices(false);
                  connect({ connector });
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              >
                {connectorLabel(connector)}
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

const SITE_FALLBACK = "https://web3-farm.pages.dev/zh/farm/";
