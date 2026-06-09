"use client";

import { useSearchParams } from "next/navigation";
import { SwapBoard } from "@/components/swap/SwapBoard";

export function SwapPageClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") ?? undefined;

  return <SwapBoard initialRoomId={roomId} />;
}
