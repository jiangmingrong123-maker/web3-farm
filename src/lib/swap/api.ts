import { SWAP_SLOTS_PER_SIDE } from "@/config/swap";
import type { VerifiedNft } from "@/lib/nft/verify";
import { SWAP_TIMEOUT_MS } from "./constants";
import type { ApiNftSlot, ApiParty, ApiRoom, ChatMessage, CreateRoomResponse } from "./api-types";

const API = "/api/rooms";
const CREATOR_KEY = (id: string) => `swap_creator_${id}`;
const LOCAL_ROOMS = "swap_local_rooms";

/** localStorage fallback is for `npm run dev` only — production must use KV API. */
function isLocalDev(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function getCreatorToken(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CREATOR_KEY(roomId));
}

export function saveCreatorToken(roomId: string, token: string) {
  sessionStorage.setItem(CREATOR_KEY(roomId), token);
}

/** Drop dev-only room cache so production never reads stale local messages. */
export function clearStaleLocalRooms() {
  if (typeof window === "undefined" || isLocalDev()) return;
  try {
    localStorage.removeItem(LOCAL_ROOMS);
  } catch {
    /* ignore */
  }
}

export function verifiedToApiSlot(nft: VerifiedNft, locked: boolean): ApiNftSlot {
  return {
    contract: nft.contract,
    tokenId: nft.tokenId.toString(),
    collectionName: nft.collectionName,
    collectionSlug: nft.collectionSlug,
    tokenUri: nft.tokenUri,
    imageUrl: nft.imageUrl,
    locked,
  };
}

function localLoad(): Record<string, ApiRoom & { creatorToken: string }> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOMS) ?? "{}");
  } catch {
    return {};
  }
}

function localSave(all: Record<string, ApiRoom & { creatorToken: string }>) {
  localStorage.setItem(LOCAL_ROOMS, JSON.stringify(all));
}

function emptyParty(): ApiParty {
  return {
    address: null,
    slots: Array.from({ length: SWAP_SLOTS_PER_SIDE }, () => null),
    confirmed: false,
  };
}

function emptyRoom(id: string): ApiRoom {
  return {
    id,
    createdAt: Date.now(),
    sideA: emptyParty(),
    sideB: emptyParty(),
    messages: [],
    chainOrderId: null,
    status: "open",
    swapDeadlineAt: null,
    depositedBy: null,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const isGet = !init?.method || init.method === "GET";
    const url = isGet
      ? `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`
      : path;

    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...init?.headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type RoomAction = "depositStarted" | "swapExecuted" | "swapReset";

async function roomActionApi(
  roomId: string,
  action: RoomAction,
  opts?: { side?: "A" | "B"; address?: string; creatorToken?: string },
): Promise<ApiRoom | null> {
  const creatorToken = opts?.creatorToken ?? getCreatorToken(roomId) ?? undefined;
  const remote = await apiFetch<ApiRoom>(`${API}/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ action, ...opts, creatorToken }),
  });
  if (remote) return remote;
  if (!isLocalDev()) return null;

  const all = localLoad();
  const entry = all[roomId];
  if (!entry) return null;

  if (action === "depositStarted" && opts?.side && !entry.swapDeadlineAt) {
    entry.swapDeadlineAt = Date.now() + SWAP_TIMEOUT_MS;
    entry.depositedBy = opts.side;
  } else if (action === "swapExecuted") {
    entry.status = "executed";
    entry.swapDeadlineAt = null;
    entry.depositedBy = null;
  } else if (action === "swapReset") {
    entry.status = "cancelled";
    entry.swapDeadlineAt = null;
    entry.depositedBy = null;
    entry.chainOrderId = null;
    for (const side of [entry.sideA, entry.sideB] as const) {
      side.confirmed = false;
      side.slots = side.slots.map((s) => (s ? { ...s, locked: false } : null));
    }
  }

  localSave(all);
  const { creatorToken: _ct, ...room } = entry;
  void _ct;
  return room;
}

export async function markDepositStartedApi(
  roomId: string,
  side: "A" | "B",
  opts?: { address?: string; creatorToken?: string },
) {
  return roomActionApi(roomId, "depositStarted", { side, ...opts });
}

export async function markSwapExecutedApi(roomId: string) {
  return roomActionApi(roomId, "swapExecuted");
}

export async function markSwapResetApi(roomId: string) {
  return roomActionApi(roomId, "swapReset");
}

export async function createRoomApi(): Promise<CreateRoomResponse> {
  const remote = await apiFetch<CreateRoomResponse>(API, { method: "POST" });
  if (remote) {
    saveCreatorToken(remote.id, remote.creatorToken);
    return remote;
  }
  if (!isLocalDev()) {
    throw new Error("API_UNAVAILABLE");
  }

  const id = crypto.randomUUID().slice(0, 8);
  const creatorToken = crypto.randomUUID().replace(/-/g, "");
  const room = emptyRoom(id);
  const all = localLoad();
  all[id] = { ...room, creatorToken };
  localSave(all);
  saveCreatorToken(id, creatorToken);
  return { id, creatorToken, room };
}

export async function fetchMessagesApi(
  roomId: string,
  since = 0,
): Promise<ChatMessage[]> {
  const remote = await apiFetch<ChatMessage[]>(
    `${API}/${roomId}/messages?since=${since}`,
  );
  return remote ?? [];
}

export async function fetchRoomApi(roomId: string): Promise<ApiRoom | null> {
  const remote = await apiFetch<ApiRoom>(`${API}/${roomId}`);
  if (remote) return remote;
  if (!isLocalDev()) return null;
  const all = localLoad();
  const entry = all[roomId];
  if (!entry) return null;
  const { creatorToken: _ct, ...room } = entry;
  void _ct;
  return room;
}

export async function updatePartyApi(
  roomId: string,
  side: "A" | "B",
  patch: Partial<ApiParty>,
  opts?: { address?: string; creatorToken?: string },
): Promise<ApiRoom | null> {
  const creatorToken = opts?.creatorToken ?? getCreatorToken(roomId) ?? undefined;
  const remote = await apiFetch<ApiRoom>(`${API}/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ side, patch, address: opts?.address, creatorToken }),
  });
  if (remote) return remote;
  if (!isLocalDev()) return null;

  const all = localLoad();
  const entry = all[roomId];
  if (!entry) return null;
  if (entry.swapDeadlineAt && Date.now() < entry.swapDeadlineAt) {
    return null;
  }
  const key = side === "A" ? "sideA" : "sideB";
  entry[key] = { ...entry[key], ...patch };
  if (opts?.address) entry[key].address = opts.address;
  if (entry.sideA.confirmed && entry.sideB.confirmed) {
    entry.status = "both_confirmed";
  } else {
    entry.status = "open";
  }
  localSave(all);
  const { creatorToken: _ct, ...room } = entry;
  void _ct;
  return room;
}

export async function sendMessageApi(
  roomId: string,
  text: string,
  nickname: string,
  opts?: { address?: string; creatorToken?: string },
): Promise<ChatMessage | null> {
  const creatorToken = opts?.creatorToken ?? getCreatorToken(roomId) ?? undefined;
  const remote = await apiFetch<ChatMessage>(`${API}/${roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, nickname, address: opts?.address, creatorToken }),
  });
  if (remote) return remote;
  if (!isLocalDev()) return null;

  const all = localLoad();
  const entry = all[roomId];
  if (!entry) return null;
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    nickname,
    sender: opts?.address ?? "guest",
    text,
    at: Date.now(),
  };
  entry.messages.push(msg);
  localSave(all);
  return msg;
}

export async function setChainOrderIdApi(
  roomId: string,
  chainOrderId: string,
  creatorToken?: string,
): Promise<ApiRoom | null> {
  const token = creatorToken ?? getCreatorToken(roomId) ?? undefined;
  const remote = await apiFetch<ApiRoom>(`${API}/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ chainOrderId, creatorToken: token }),
  });
  if (remote) return remote;
  if (!isLocalDev()) return null;

  const all = localLoad();
  const entry = all[roomId];
  if (!entry) return null;
  entry.chainOrderId = chainOrderId;
  localSave(all);
  const { creatorToken: _ct, ...room } = entry;
  void _ct;
  return room;
}

const GUEST_SIDE_KEY = (roomId: string) => `swap_guest_${roomId}`;

export function resolveMySide(
  room: ApiRoom,
  address: string | undefined,
  creatorToken: string | null,
  roomId?: string,
): "A" | "B" | null {
  if (address) {
    if (room.sideA.address?.toLowerCase() === address.toLowerCase()) return "A";
    if (room.sideB.address?.toLowerCase() === address.toLowerCase()) return "B";
    if (!room.sideA.address) return "A";
    if (!room.sideB.address) return "B";
  }
  if (creatorToken) return "A";
  if (roomId && typeof window !== "undefined") {
    const stored = sessionStorage.getItem(GUEST_SIDE_KEY(roomId));
    if (stored === "B") return "B";
    sessionStorage.setItem(GUEST_SIDE_KEY(roomId), "B");
    return "B";
  }
  return null;
}

export function counterSide(side: "A" | "B"): "A" | "B" {
  return side === "A" ? "B" : "A";
}

export function getParty(room: ApiRoom, side: "A" | "B"): ApiParty {
  return side === "A" ? room.sideA : room.sideB;
}
