"use client";

import { useTranslations } from "next-intl";
import type { CollectionConfig } from "@/config/collections";

interface CollectionCardProps {
  collection: CollectionConfig;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const t = useTranslations("collection");

  return (
    <article className="rounded-2xl border border-white/10 bg-surface/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">{collection.name}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            collection.enabled
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/10 text-white/40"
          }`}
        >
          {collection.enabled ? t("enabled") : t("disabled")}
        </span>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{t("chain")}</dt>
          <dd>Ethereum ({collection.chainId})</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{t("standard")}</dt>
          <dd className="uppercase">{collection.standard}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">{t("strategy")}</dt>
          <dd className="font-mono text-xs">{collection.rarityStrategy}</dd>
        </div>
        <div>
          <dt className="mb-1 text-white/40">{t("contract")}</dt>
          <dd className="break-all font-mono text-xs text-white/70">
            {collection.contractAddress}
          </dd>
        </div>
      </dl>
    </article>
  );
}
