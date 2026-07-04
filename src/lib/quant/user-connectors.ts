/** 用户自备连接器配置（仅存浏览器 localStorage，不上传服务器） */

const KEY = "web3farm_quant_connectors";

export type ConnectorKind = "exchange_api" | "ai_webhook" | "wallet";

export type UserConnectorConfig = {
  /** 交易所 API（用户自己的 Key，可选只读） */
  exchangeEnabled: boolean;
  exchangeLabel: string;
  exchangeApiKey: string;
  exchangeApiSecret: string;
  exchangeReadOnly: boolean;
  /** 用户自托管 AI / 机器人 Webhook */
  aiWebhookEnabled: boolean;
  aiWebhookUrl: string;
  aiWebhookNote: string;
  /** 是否允许本地模拟自动按信号下单（仍非实盘） */
  paperAutoEnabled: boolean;
};

export function defaultConnectorConfig(): UserConnectorConfig {
  return {
    exchangeEnabled: false,
    exchangeLabel: "",
    exchangeApiKey: "",
    exchangeApiSecret: "",
    exchangeReadOnly: true,
    aiWebhookEnabled: false,
    aiWebhookUrl: "",
    aiWebhookNote: "",
    paperAutoEnabled: false,
  };
}

export function loadConnectorConfig(): UserConnectorConfig {
  if (typeof window === "undefined") return defaultConnectorConfig();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultConnectorConfig();
    return { ...defaultConnectorConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConnectorConfig();
  }
}

export function saveConnectorConfig(cfg: UserConnectorConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function clearConnectorSecrets(): UserConnectorConfig {
  const c = defaultConnectorConfig();
  saveConnectorConfig(c);
  return c;
}

/** 向用户自填 Webhook 推送信号（由用户自己的服务处理下单/AI） */
export async function notifyUserWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "empty_url" };
  try {
    const res = await fetch(trimmed, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "web3-farm-quant-tool",
        ...payload,
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `http_${res.status}` };
  } catch {
    try {
      await fetch(trimmed, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web3-farm-quant-tool", ...payload }),
        mode: "no-cors",
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "network" };
    }
  }
}

export type SignalPayload = {
  signal: "buy" | "sell" | "hold";
  poolId: string;
  poolLabel: string;
  priceUsd: number | null;
  strategyId: string;
  params: Record<string, number>;
  at: number;
};

