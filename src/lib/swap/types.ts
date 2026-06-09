import type { VerifiedNft } from "@/lib/nft/verify";

export type SwapSide = "self" | "counterparty";

export interface SwapSlotItem {
  nft: VerifiedNft;
  locked: boolean;
}

export interface SwapPartyState {
  address: string | null;
  slots: (SwapSlotItem | null)[];
  confirmed: boolean;
}

export interface SwapRoom {
  id: string;
  createdAt: number;
  self: SwapPartyState;
  counterparty: SwapPartyState;
  status: "open" | "both_confirmed" | "completed";
}
