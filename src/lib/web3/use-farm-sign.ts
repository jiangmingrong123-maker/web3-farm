"use client";

import { useCallback } from "react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import type { FarmSignFn } from "@/lib/farm-api";

/** Wallet signature for farm/TD APIs — explicit account + mainnet for OKX mobile. */
export function useFarmSign(): FarmSignFn {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  return useCallback(
    async (message) => {
      if (!isConnected || !address) {
        throw new Error("NOT_CONNECTED");
      }
      if (!signMessageAsync) {
        throw new Error("NO_SIGNER");
      }

      if (chainId !== mainnet.id) {
        try {
          await switchChainAsync({ chainId: mainnet.id });
        } catch {
          throw new Error("WRONG_NETWORK");
        }
      }

      return signMessageAsync({ message, account: address });
    },
    [address, chainId, isConnected, signMessageAsync, switchChainAsync],
  );
}
