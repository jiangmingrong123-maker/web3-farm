/** JSON-serializable slot for API / KV storage. */
export interface ApiNftSlot {
  contract: string;
  tokenId: string;
  collectionName: string;
  collectionSlug: string;
  imageUrl: string | null;
  locked: boolean;
}

export interface ApiParty {
  address: string | null;
  slots: (ApiNftSlot | null)[];
  confirmed: boolean;
}

export interface ChatMessage {
  id: string;
  nickname: string;
  sender: string;
  text: string;
  at: number;
}

export interface ApiRoom {
  id: string;
  createdAt: number;
  sideA: ApiParty;
  sideB: ApiParty;
  messages: ChatMessage[];
  chainOrderId: string | null;
  status: "open" | "both_confirmed" | "executed" | "cancelled";
  /** Unix ms — countdown end when one side deposited */
  swapDeadlineAt: number | null;
  depositedBy: "A" | "B" | null;
}

export interface CreateRoomResponse {
  id: string;
  creatorToken: string;
  room: ApiRoom;
}
