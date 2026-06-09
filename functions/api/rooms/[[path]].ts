/**
 * Cloudflare Pages Function — swap room API + chat.
 * Bind KV namespace "SWAP_KV" in Pages → Settings → Bindings.
 */

const SWAP_TIMEOUT_MS = 10 * 60 * 1000;
const WHITELIST = ["0xa28d6a8eb65a41f3958f1de62cbfca20b817e66a"];

interface ApiNftSlot {
  contract: string;
  tokenId: string;
  collectionName: string;
  collectionSlug: string;
  imageUrl: string | null;
  locked: boolean;
}

interface ApiParty {
  address: string | null;
  slots: (ApiNftSlot | null)[];
  confirmed: boolean;
}

interface ChatMessage {
  id: string;
  nickname: string;
  sender: string;
  text: string;
  at: number;
}

interface StoredRoom {
  id: string;
  creatorToken: string;
  createdAt: number;
  sideA: ApiParty;
  sideB: ApiParty;
  messages: ChatMessage[];
  chainOrderId: string | null;
  status: "open" | "both_confirmed" | "executed" | "cancelled";
  swapDeadlineAt: number | null;
  depositedBy: "A" | "B" | null;
}

interface Env {
  SWAP_KV?: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
}

const memory = new Map<string, StoredRoom>();

function emptyParty(): ApiParty {
  return { address: null, slots: [null, null, null, null], confirmed: false };
}

function emptyRoom(id: string, creatorToken: string): StoredRoom {
  return {
    id,
    creatorToken,
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

function normalizeRoom(raw: StoredRoom): StoredRoom {
  return {
    ...emptyRoom(raw.id, raw.creatorToken),
    ...raw,
    swapDeadlineAt: raw.swapDeadlineAt ?? null,
    depositedBy: raw.depositedBy ?? null,
  };
}

async function loadRoom(env: Env, id: string): Promise<StoredRoom | null> {
  if (env.SWAP_KV) {
    const raw = await env.SWAP_KV.get(`room:${id}`);
    if (raw) return normalizeRoom(JSON.parse(raw) as StoredRoom);
    return null;
  }
  return memory.get(id) ?? null;
}

async function saveRoom(env: Env, room: StoredRoom) {
  if (env.SWAP_KV) {
    await env.SWAP_KV.put(`room:${room.id}`, JSON.stringify(room));
  } else {
    memory.set(room.id, room);
  }
}

function publicRoom(room: StoredRoom) {
  const { creatorToken: _, ...rest } = room;
  return rest;
}

function authCreator(room: StoredRoom, token?: string) {
  return !!token && token === room.creatorToken;
}

function canEditSide(
  room: StoredRoom,
  side: "A" | "B",
  address?: string,
  creatorToken?: string,
): boolean {
  if (side === "A" && authCreator(room, creatorToken)) return true;
  const party = side === "A" ? room.sideA : room.sideB;
  if (address && party.address?.toLowerCase() === address.toLowerCase()) return true;
  if (address && !party.address) return true;
  return false;
}

function validateSlots(slots: (ApiNftSlot | null)[]): boolean {
  for (const slot of slots) {
    if (!slot) continue;
    if (!WHITELIST.includes(slot.contract.toLowerCase())) return false;
    if (!/^\d+$/.test(slot.tokenId)) return false;
  }
  return true;
}

function unlockParties(room: StoredRoom) {
  for (const party of [room.sideA, room.sideB]) {
    party.confirmed = false;
    party.slots = party.slots.map((s) => (s ? { ...s, locked: false } : null));
  }
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}) => {
  const { request, env, params } = context;
  const path = (params.path as string[] | undefined) ?? [];
  const method = request.method;
  const url = new URL(request.url);

  if (path.length === 0 && method === "POST") {
    const id = crypto.randomUUID().slice(0, 8);
    const creatorToken = crypto.randomUUID().replace(/-/g, "");
    const room = emptyRoom(id, creatorToken);
    await saveRoom(env, room);
    return Response.json({ id, creatorToken, room: publicRoom(room) });
  }

  const roomId = path[0];
  if (!roomId) return new Response("Not found", { status: 404 });

  if (path[1] === "messages") {
    const room = await loadRoom(env, roomId);
    if (!room) return new Response("Room not found", { status: 404 });

    if (method === "GET") {
      const since = Number(url.searchParams.get("since") ?? 0);
      return Response.json(room.messages.filter((m) => m.at > since));
    }

    if (method === "POST") {
      const body = (await request.json()) as {
        text?: string;
        nickname?: string;
        address?: string;
        creatorToken?: string;
      };
      const text = (body.text ?? "").trim().slice(0, 500);
      const nickname = (body.nickname ?? "Guest").trim().slice(0, 32);
      if (!text) return new Response("Empty message", { status: 400 });

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        nickname,
        sender: body.address ?? (authCreator(room, body.creatorToken) ? "creator" : "guest"),
        text,
        at: Date.now(),
      };
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages = room.messages.slice(-200);
      await saveRoom(env, room);
      return Response.json(msg);
    }

    return new Response("Method not allowed", { status: 405 });
  }

  if (method === "GET" && path.length === 1) {
    const room = await loadRoom(env, roomId);
    if (!room) return new Response("Room not found", { status: 404 });
    return Response.json(publicRoom(room));
  }

  if (method === "PATCH" && path.length === 1) {
    const room = await loadRoom(env, roomId);
    if (!room) return new Response("Room not found", { status: 404 });

    const body = (await request.json()) as {
      side?: "A" | "B";
      patch?: Partial<ApiParty>;
      address?: string;
      creatorToken?: string;
      chainOrderId?: string;
      action?: "depositStarted" | "swapExecuted" | "swapReset";
    };

    if (body.action === "depositStarted") {
      if (!body.side || !canEditSide(room, body.side, body.address, body.creatorToken)) {
        return new Response("Unauthorized", { status: 403 });
      }
      if (!room.swapDeadlineAt) {
        room.swapDeadlineAt = Date.now() + SWAP_TIMEOUT_MS;
        room.depositedBy = body.side;
      }
      await saveRoom(env, room);
      return Response.json(publicRoom(room));
    }

    if (body.action === "swapExecuted") {
      room.status = "executed";
      room.swapDeadlineAt = null;
      room.depositedBy = null;
      await saveRoom(env, room);
      return Response.json(publicRoom(room));
    }

    if (body.action === "swapReset") {
      room.status = "cancelled";
      room.swapDeadlineAt = null;
      room.depositedBy = null;
      room.chainOrderId = null;
      unlockParties(room);
      await saveRoom(env, room);
      return Response.json(publicRoom(room));
    }

    if (body.chainOrderId) {
      if (!authCreator(room, body.creatorToken)) {
        return new Response("Unauthorized", { status: 403 });
      }
      room.chainOrderId = body.chainOrderId;
      await saveRoom(env, room);
      return Response.json(publicRoom(room));
    }

    if (!body.side || !body.patch) {
      return new Response("Bad request", { status: 400 });
    }

    if (!canEditSide(room, body.side, body.address, body.creatorToken)) {
      return new Response("Unauthorized", { status: 403 });
    }

    if (room.swapDeadlineAt && Date.now() < room.swapDeadlineAt) {
      return new Response("Swap in progress", { status: 409 });
    }

    const key = body.side === "A" ? "sideA" : "sideB";
    const party = room[key];
    if (body.address) party.address = body.address;
    if (body.patch.slots) {
      if (!validateSlots(body.patch.slots)) {
        return new Response("Invalid slot contract", { status: 400 });
      }
      party.slots = body.patch.slots;
    }
    if (typeof body.patch.confirmed === "boolean") party.confirmed = body.patch.confirmed;

    if (room.sideA.confirmed && room.sideB.confirmed) {
      room.status = "both_confirmed";
    } else {
      room.status = "open";
    }

    await saveRoom(env, room);
    return Response.json(publicRoom(room));
  }

  return new Response("Not found", { status: 404 });
};
