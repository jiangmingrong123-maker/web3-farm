"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QuantCard } from "@/components/quant/QuantDock";
import {
  clearConnectorSecrets,
  loadConnectorConfig,
  saveConnectorConfig,
  type UserConnectorConfig,
} from "@/lib/quant/user-connectors";

export function ConnectorsPanel() {
  const t = useTranslations("quant");
  const [cfg, setCfg] = useState<UserConnectorConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCfg(loadConnectorConfig());
  }, []);

  if (!cfg) return null;

  const update = (patch: Partial<UserConnectorConfig>) => {
    setCfg((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  };

  const persist = () => {
    saveConnectorConfig(cfg);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">{t("connectorsHint")}</p>

      <QuantCard title={t("connectorExchangeTitle")}>
        <label className="mb-3 flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={cfg.exchangeEnabled}
            onChange={(e) => update({ exchangeEnabled: e.target.checked })}
          />
          {t("connectorEnable")}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("connectorExchangeLabel")}
            value={cfg.exchangeLabel}
            onChange={(v) => update({ exchangeLabel: v })}
            placeholder="Binance / OKX / …"
          />
          <label className="flex items-end gap-2 pb-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={cfg.exchangeReadOnly}
              onChange={(e) => update({ exchangeReadOnly: e.target.checked })}
            />
            {t("connectorReadOnly")}
          </label>
          <Field
            label={t("connectorApiKey")}
            value={cfg.exchangeApiKey}
            onChange={(v) => update({ exchangeApiKey: v })}
            secret
          />
          <Field
            label={t("connectorApiSecret")}
            value={cfg.exchangeApiSecret}
            onChange={(v) => update({ exchangeApiSecret: v })}
            secret
          />
        </div>
        <p className="mt-2 text-[10px] text-amber-400/80">{t("connectorLocalOnly")}</p>
      </QuantCard>

      <QuantCard title={t("connectorAiTitle")}>
        <label className="mb-3 flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={cfg.aiWebhookEnabled}
            onChange={(e) => update({ aiWebhookEnabled: e.target.checked })}
          />
          {t("connectorEnable")}
        </label>
        <Field
          label={t("connectorWebhookUrl")}
          value={cfg.aiWebhookUrl}
          onChange={(v) => update({ aiWebhookUrl: v })}
          placeholder="https://your-server.com/hook"
        />
        <Field
          label={t("connectorWebhookNote")}
          value={cfg.aiWebhookNote}
          onChange={(v) => update({ aiWebhookNote: v })}
          placeholder={t("connectorWebhookNotePh")}
        />
        <p className="mt-2 text-[10px] text-white/35">{t("connectorAiHint")}</p>
      </QuantCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={persist}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink"
        >
          {saved ? t("connectorSaved") : t("connectorSave")}
        </button>
        <button
          type="button"
          onClick={() => setCfg(clearConnectorSecrets())}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/50"
        >
          {t("connectorClear")}
        </button>
      </div>

      <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/40">
        {t("connectorComingSoon")}
      </p>

      <QuantCard title={t("connectorWalletTitle")}>
        <p className="text-xs leading-relaxed text-white/45">{t("connectorWalletHint")}</p>
      </QuantCard>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
      />
    </label>
  );
}
