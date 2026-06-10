/** Keep in sync with functions/lib/farm-sign.ts */
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
