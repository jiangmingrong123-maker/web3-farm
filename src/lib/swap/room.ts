import { SWAP_SLOTS_PER_SIDE } from "@/config/swap";
import type { SwapRoom, SwapPartyState } from "./types";

const STORAGE_PREFIX = "web3farm_swap_room_";

function emptyParty(): SwapPartyState {
  return {
    address: null,
    slots: Array.from({ length: SWAP_SLOTS_PER_SIDE }, () => null),
    confirmed: false,
  };
}

export function createRoomId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function createEmptyRoom(id: string): SwapRoom {
  return {
    id,
    createdAt: Date.now(),
    self: emptyParty(),
    counterparty: emptyParty(),
    status: "open",
  };
}

function key(roomId: string) {
  return `${STORAGE_PREFIX}${roomId}`;
}

export function loadRoom(roomId: string): SwapRoom {
  if (typeof window === "undefined") return createEmptyRoom(roomId);
  try {
    const raw = localStorage.getItem(key(roomId));
    if (!raw) return createEmptyRoom(roomId);
    return { ...createEmptyRoom(roomId), ...JSON.parse(raw), id: roomId };
  } catch {
    return createEmptyRoom(roomId);
  }
}

export function saveRoom(room: SwapRoom) {
  localStorage.setItem(key(room.id), JSON.stringify(room));
}

/** Serialize VerifiedNft for JSON storage. */
export function serializeRoom(room: SwapRoom): SwapRoom {
  return JSON.parse(JSON.stringify(room, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  )) as SwapRoom;
}

export function hydrateRoom(raw: SwapRoom): SwapRoom {
  const hydrateParty = (party: SwapPartyState): SwapPartyState => ({
    ...party,
    slots: party.slots.map((slot) => {
      if (!slot) return null;
      return {
        ...slot,
        nft: {
          ...slot.nft,
          tokenId: BigInt(slot.nft.tokenId as unknown as string),
        },
      };
    }),
  });

  return {
    ...raw,
    self: hydrateParty(raw.self),
    counterparty: hydrateParty(raw.counterparty),
  };
}
