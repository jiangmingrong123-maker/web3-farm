"use client";

import { useCallback, useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { SWAP_ESCROW_ADDRESS, SWAP_ESCROW_ENABLED } from "@/config/swap";
import type { ApiParty, ApiRoom } from "./api-types";
import { swapEscrowAbi, type NftItemInput } from "./escrow-abi";
import { erc721Abi } from "@/lib/nft/abi";
import { setChainOrderIdApi } from "./api";

function partyToItems(party: ApiParty): NftItemInput[] {
  return party.slots
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({
      collection: s.contract as `0x${string}`,
      tokenId: BigInt(s.tokenId),
    }));
}

export function useSwapExecute(room: ApiRoom | null, mySide: "A" | "B" | null) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureApprovals = useCallback(
    async (items: NftItemInput[]) => {
      if (!address || !publicClient) return;
      for (const item of items) {
        const approved = await publicClient.readContract({
          address: item.collection,
          abi: erc721Abi,
          functionName: "isApprovedForAll",
          args: [address, SWAP_ESCROW_ADDRESS],
        });
        if (!approved) {
          await writeContractAsync({
            address: item.collection,
            abi: erc721Abi,
            functionName: "setApprovalForAll",
            args: [SWAP_ESCROW_ADDRESS, true],
          });
        }
      }
    },
    [address, publicClient, writeContractAsync],
  );

  const execute = useCallback(async () => {
    if (!room || !mySide || !address || !SWAP_ESCROW_ENABLED || !publicClient) return;
    setPending(true);
    setError(null);

    try {
      const makerItems = partyToItems(room.sideA);
      const takerItems = partyToItems(room.sideB);
      let orderId = room.chainOrderId as `0x${string}` | null;

      if (mySide === "A" && !orderId) {
        await ensureApprovals(makerItems);
        const sim = await publicClient.simulateContract({
          address: SWAP_ESCROW_ADDRESS,
          abi: swapEscrowAbi,
          functionName: "createOrder",
          args: [makerItems],
          account: address,
        });
        orderId = sim.result as `0x${string}`;
        const hash = await writeContractAsync(sim.request);
        await publicClient.waitForTransactionReceipt({ hash });
        await setChainOrderIdApi(room.id, orderId);
      }

      if (!orderId) {
        setError("NO_ORDER");
        return;
      }

      if (mySide === "B") {
        const order = await publicClient.readContract({
          address: SWAP_ESCROW_ADDRESS,
          abi: swapEscrowAbi,
          functionName: "orders",
          args: [orderId],
        });
        const taker = order[1] as string;
        if (taker === "0x0000000000000000000000000000000000000000") {
          await ensureApprovals(takerItems);
          const sim = await publicClient.simulateContract({
            address: SWAP_ESCROW_ADDRESS,
            abi: swapEscrowAbi,
            functionName: "acceptOrder",
            args: [orderId, takerItems],
            account: address,
          });
          const hash = await writeContractAsync(sim.request);
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }

      const confirmSim = await publicClient.simulateContract({
        address: SWAP_ESCROW_ADDRESS,
        abi: swapEscrowAbi,
        functionName: "confirm",
        args: [orderId],
        account: address,
      });
      const hash = await writeContractAsync(confirmSim.request);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch {
      setError("TX_FAILED");
    } finally {
      setPending(false);
    }
  }, [
    room,
    mySide,
    address,
    ensureApprovals,
    writeContractAsync,
    publicClient,
  ]);

  const canExecute =
    SWAP_ESCROW_ENABLED &&
    !!room &&
    room.status === "both_confirmed" &&
    !!mySide &&
    !!address;

  return { execute, pending, error, canExecute };
}
