"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignMessage, useWriteContract, usePublicClient } from "wagmi";
import { SWAP_ESCROW_ADDRESS, SWAP_ESCROW_ENABLED } from "@/config/swap";
import type { ApiParty, ApiRoom } from "./api-types";
import type { SwapOrderStatus } from "./use-swap-order-status";
import { swapEscrowAbi, type NftItemInput } from "./escrow-abi";
import { chargeSwapFeeApi } from "@/lib/farm-api";
import {
  markDepositStartedApi,
  markSwapExecutedApi,
  markSwapResetApi,
  setChainOrderIdApi,
} from "./api";

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

export function useSwapExecute(
  room: ApiRoom | null,
  mySide: "A" | "B" | null,
  orderStatus: SwapOrderStatus,
  onChainUpdate?: () => void,
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOrderId = useCallback(async (): Promise<`0x${string}` | null> => {
    if (!room?.chainOrderId) return null;
    return room.chainOrderId as `0x${string}`;
  }, [room?.chainOrderId]);

  const createOrder = useCallback(async () => {
    if (!room || mySide !== "A" || !address || !publicClient) return null;
    const taker = counterpartyAddress(room, "A");
    if (!taker) {
      setError("NO_COUNTERPARTY");
      return null;
    }
    const sim = await publicClient.simulateContract({
      address: SWAP_ESCROW_ADDRESS,
      abi: swapEscrowAbi,
      functionName: "createOrder",
      args: [taker, partyToItems(room.sideA), partyToItems(room.sideB)],
      account: address,
    });
    const orderId = sim.result as `0x${string}`;
    const hash = await writeContractAsync(sim.request);
    await publicClient.waitForTransactionReceipt({ hash });
    await setChainOrderIdApi(room.id, orderId);
    onChainUpdate?.();
    return orderId;
  }, [room, mySide, address, publicClient, writeContractAsync, onChainUpdate]);

  const deposit = useCallback(async () => {
    if (!room || !mySide || !address || !SWAP_ESCROW_ENABLED || !publicClient) return;
    setPending(true);
    setError(null);
    try {
      if (!signMessageAsync) {
        setError("TX_FAILED");
        return;
      }
      const fee = await chargeSwapFeeApi(address, room.id, (message) =>
        signMessageAsync({ message }),
      );
      if (!fee.ok) {
        setError(fee.error === "INSUFFICIENT_POINTS" ? "INSUFFICIENT_POINTS" : "TX_FAILED");
        return;
      }

      if (mySide === "B" && !room.chainOrderId) {
        setError("WAIT_MAKER");
        return;
      }

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
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      await markDepositStartedApi(room.id, mySide, { address });

      const o = await publicClient.readContract({
        address: SWAP_ESCROW_ADDRESS,
        abi: swapEscrowAbi,
        functionName: "orders",
        args: [orderId],
      });
      if (o[6]) {
        await markSwapExecutedApi(room.id);
      }

      void receipt;
      onChainUpdate?.();
    } catch {
      setError("TX_FAILED");
    } finally {
      setPending(false);
    }
  }, [
    room,
    mySide,
    address,
    signMessageAsync,
    publicClient,
    writeContractAsync,
    getOrderId,
    createOrder,
    onChainUpdate,
  ]);

  const withdraw = useCallback(async () => {
    if (!room || !mySide || !address || !publicClient) return;
    const orderId = await getOrderId();
    if (!orderId) {
      await markSwapResetApi(room.id);
      onChainUpdate?.();
      return;
    }
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
      await markSwapResetApi(room.id);
      onChainUpdate?.();
    } catch {
      setError("TX_FAILED");
    } finally {
      setPending(false);
    }
  }, [room, mySide, address, publicClient, writeContractAsync, getOrderId, onChainUpdate]);

  const swapInProgress =
    orderStatus.awaitingCounterparty && !orderStatus.expired;

  const canDeposit =
    SWAP_ESCROW_ENABLED &&
    !!room &&
    room.status === "both_confirmed" &&
    !!mySide &&
    !!address &&
    !orderStatus.myDeposited &&
    !orderStatus.executed &&
    !orderStatus.expired &&
    (mySide === "A" || !!room.chainOrderId);

  const canWithdraw =
    SWAP_ESCROW_ENABLED &&
    orderStatus.expired &&
    orderStatus.myDeposited &&
    !orderStatus.executed;

  return {
    deposit,
    withdraw,
    pending,
    error,
    canDeposit,
    canWithdraw,
    swapInProgress,
    myDeposited: orderStatus.myDeposited,
  };
}
