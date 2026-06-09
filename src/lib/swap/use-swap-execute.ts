"use client";

import { useCallback, useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { SWAP_ESCROW_ADDRESS, SWAP_ESCROW_ENABLED } from "@/config/swap";
import type { ApiParty, ApiRoom } from "./api-types";
import { swapEscrowAbi, type NftItemInput, WITHDRAW_TIMEOUT_SEC } from "./escrow-abi";
import { setChainOrderIdApi } from "./api";

function partyToItems(party: ApiParty): NftItemInput[] {
  return party.slots
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({
      collection: s.contract as `0x${string}`,
      tokenId: BigInt(s.tokenId),
    }));
}

function counterpartyAddress(room: ApiRoom, mySide: "A" | "B"): `0x${string}` | null {
  const other = mySide === "A" ? room.sideB : room.sideA;
  if (!other.address) return null;
  return other.address as `0x${string}`;
}

export function useSwapExecute(room: ApiRoom | null, mySide: "A" | "B" | null) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOrderId = useCallback(async (): Promise<`0x${string}` | null> => {
    if (!room?.chainOrderId) return null;
    return room.chainOrderId as `0x${string}`;
  }, [room?.chainOrderId]);

  /** Create on-chain order (maker / side A). */
  const createOrder = useCallback(async () => {
    if (!room || mySide !== "A" || !address || !publicClient) return null;
    const taker = counterpartyAddress(room, "A");
    if (!taker) {
      setError("NO_COUNTERPARTY");
      return null;
    }
    const makerItems = partyToItems(room.sideA);
    const takerItems = partyToItems(room.sideB);
    const sim = await publicClient.simulateContract({
      address: SWAP_ESCROW_ADDRESS,
      abi: swapEscrowAbi,
      functionName: "createOrder",
      args: [taker, makerItems, takerItems],
      account: address,
    });
    const orderId = sim.result as `0x${string}`;
    const hash = await writeContractAsync(sim.request);
    await publicClient.waitForTransactionReceipt({ hash });
    await setChainOrderIdApi(room.id, orderId);
    return orderId;
  }, [room, mySide, address, publicClient, writeContractAsync]);

  /**
   * Deposit NFTs into escrow (no approve-all).
   * When both sides deposited, contract auto-executes atomically.
   */
  const deposit = useCallback(async () => {
    if (!room || !mySide || !address || !SWAP_ESCROW_ENABLED || !publicClient) return;
    setPending(true);
    setError(null);
    try {
      let orderId = await getOrderId();
      if (!orderId && mySide === "A") {
        orderId = await createOrder();
      }
      if (!orderId) {
        setError("NO_ORDER");
        return;
      }

      const sim = await publicClient.simulateContract({
        address: SWAP_ESCROW_ADDRESS,
        abi: swapEscrowAbi,
        functionName: "deposit",
        args: [orderId],
        account: address,
      });
      const hash = await writeContractAsync(sim.request);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch {
      setError("TX_FAILED");
    } finally {
      setPending(false);
    }
  }, [room, mySide, address, publicClient, writeContractAsync, getOrderId, createOrder]);

  /** Reclaim after 48h if counterparty never deposited. */
  const withdraw = useCallback(async () => {
    if (!room || !mySide || !address || !publicClient) return;
    const orderId = await getOrderId();
    if (!orderId) return;
    setPending(true);
    setError(null);
    try {
      const sim = await publicClient.simulateContract({
        address: SWAP_ESCROW_ADDRESS,
        abi: swapEscrowAbi,
        functionName: "withdraw",
        args: [orderId],
        account: address,
      });
      const hash = await writeContractAsync(sim.request);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch {
      setError("TX_FAILED");
    } finally {
      setPending(false);
    }
  }, [room, mySide, address, publicClient, writeContractAsync, getOrderId]);

  const canDeposit =
    SWAP_ESCROW_ENABLED &&
    !!room &&
    room.status === "both_confirmed" &&
    !!mySide &&
    !!address &&
    (mySide === "B" ? !!room.sideA.address : true);

  return {
    deposit,
    withdraw,
    pending,
    error,
    canDeposit,
    withdrawTimeoutHours: WITHDRAW_TIMEOUT_SEC / 3600,
  };
}
