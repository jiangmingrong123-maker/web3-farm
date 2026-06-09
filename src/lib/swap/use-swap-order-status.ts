"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { SWAP_ESCROW_ADDRESS, SWAP_ESCROW_ENABLED } from "@/config/swap";
import { swapEscrowAbi, WITHDRAW_TIMEOUT_SEC } from "./escrow-abi";

export interface SwapOrderStatus {
  makerDeposited: boolean;
  takerDeposited: boolean;
  executed: boolean;
  /** Unix sec — when the solo depositor put NFTs in */
  soloDepositAt: number;
  /** One side deposited, waiting for the other */
  awaitingCounterparty: boolean;
  /** Seconds left until timeout (0 = expired) */
  remainingSec: number;
  expired: boolean;
  myDeposited: boolean;
}

const EMPTY: SwapOrderStatus = {
  makerDeposited: false,
  takerDeposited: false,
  executed: false,
  soloDepositAt: 0,
  awaitingCounterparty: false,
  remainingSec: 0,
  expired: false,
  myDeposited: false,
};

export function useSwapOrderStatus(
  orderId: string | null | undefined,
  mySide: "A" | "B" | null,
  tick: number,
) {
  const publicClient = usePublicClient();
  const [raw, setRaw] = useState<{
    makerDeposited: boolean;
    takerDeposited: boolean;
    makerDepositAt: bigint;
    takerDepositAt: bigint;
    executed: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!SWAP_ESCROW_ENABLED || !orderId || !publicClient) {
      setRaw(null);
      return;
    }
    try {
      const o = await publicClient.readContract({
        address: SWAP_ESCROW_ADDRESS,
        abi: swapEscrowAbi,
        functionName: "orders",
        args: [orderId as `0x${string}`],
      });
      setRaw({
        makerDeposited: o[2],
        takerDeposited: o[3],
        makerDepositAt: o[4],
        takerDepositAt: o[5],
        executed: o[6],
      });
    } catch {
      setRaw(null);
    }
  }, [orderId, publicClient]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  void tick;

  if (!raw || !mySide) return EMPTY;

  const makerOnly = raw.makerDeposited && !raw.takerDeposited;
  const takerOnly = raw.takerDeposited && !raw.makerDeposited;
  const awaitingCounterparty = (makerOnly || takerOnly) && !raw.executed;

  let soloDepositAt = 0;
  if (makerOnly && raw.makerDepositAt > BigInt(0)) {
    soloDepositAt = Number(raw.makerDepositAt);
  } else if (takerOnly && raw.takerDepositAt > BigInt(0)) {
    soloDepositAt = Number(raw.takerDepositAt);
  }

  const deadlineMs = soloDepositAt * 1000 + WITHDRAW_TIMEOUT_SEC * 1000;
  const remainingSec = awaitingCounterparty
    ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
    : 0;
  const expired = awaitingCounterparty && remainingSec === 0;

  const myDeposited =
    mySide === "A" ? raw.makerDeposited : raw.takerDeposited;

  return {
    makerDeposited: raw.makerDeposited,
    takerDeposited: raw.takerDeposited,
    executed: raw.executed,
    soloDepositAt,
    awaitingCounterparty,
    remainingSec,
    expired,
    myDeposited,
  };
}
