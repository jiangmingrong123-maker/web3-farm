/** Keep in sync with src/lib/farm-sign.ts */
import { recoverMessageAddress } from "viem";

export const FARM_SIGN_MAX_AGE_MS = 5 * 60 * 1000;

export function buildFarmSignMessage(
  action: string,
  wallet: string,
  timestamp: number,
  data?: string,
): string {
  const lines = [
    "Web3 Farm Season 0",
    `Action: ${action}`,
    `Wallet: ${wallet.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
  ];
  if (data) lines.push(`Data: ${data}`);
  return lines.join("\n");
}

export async function verifyFarmSignature(
  action: string,
  wallet: string,
  timestamp: number,
  signature: string,
  data?: string,
): Promise<boolean> {
  if (!signature?.startsWith("0x")) return false;
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > FARM_SIGN_MAX_AGE_MS) {
    return false;
  }
  const message = buildFarmSignMessage(action, wallet, timestamp, data);
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recovered.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}

export interface SignedBody {
  timestamp?: number;
  signature?: string;
}

export async function requireWalletSignature(
  action: string,
  wallet: string,
  body: SignedBody,
  data?: string,
): Promise<Response | null> {
  const { timestamp, signature } = body;
  if (timestamp == null || !signature) {
    return new Response("Missing signature", { status: 401 });
  }
  const ok = await verifyFarmSignature(action, wallet, timestamp, signature, data);
  if (!ok) return new Response("Invalid signature", { status: 403 });
  return null;
}
