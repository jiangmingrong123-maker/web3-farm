"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { COLLECTIONS } from "@/config/collections";
import { resolveNftImage } from "@/lib/nft/metadata";
import { verifyNftOwnership, type VerifyNftError } from "@/lib/nft/verify";
import type { VerifiedNft } from "@/lib/nft/verify";

interface AddNftPanelProps {
  onAdded: (nft: VerifiedNft) => void;
  onCancel: () => void;
}

const ERROR_KEYS: Record<VerifyNftError, string> = {
  NOT_WHITELISTED: "errNotWhitelisted",
  INVALID_TOKEN_ID: "errInvalidToken",
  NOT_OWNER: "errNotOwner",
  RPC_ERROR: "errRpc",
  NOT_FOUND: "errNotFound",
};

export function AddNftPanel({ onAdded, onCancel }: AddNftPanelProps) {
  const t = useTranslations("swap");
  const { address, isConnected } = useAccount();
  const enabledCollections = COLLECTIONS.filter((c) => c.enabled);
  const [collectionSlug, setCollectionSlug] = useState(enabledCollections[0]?.slug ?? "");
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<VerifyNftError | null>(null);

  const selected = enabledCollections.find((c) => c.slug === collectionSlug);

  const handleVerify = async () => {
    if (!isConnected || !address || !selected) return;
    setLoading(true);
    setError(null);

    const result = await verifyNftOwnership(
      selected.contractAddress,
      tokenId.trim(),
      address,
    );

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    let imageUrl = result.nft.imageUrl;
    if (!imageUrl && result.nft.tokenUri) {
      imageUrl = await resolveNftImage(result.nft.tokenUri);
    }

    onAdded({ ...result.nft, imageUrl });
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-gold/30 bg-surface/80 p-4">
      <h3 className="mb-3 text-sm font-bold text-gold">{t("addNftTitle")}</h3>

      <div className="space-y-3">
        <label className="block text-xs text-white/50">
          {t("selectCollection")}
          <select
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {enabledCollections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.contractAddress.slice(0, 6)}…{c.contractAddress.slice(-4)})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-white/50">
          Token ID
          <input
            type="text"
            inputMode="numeric"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="6037"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white"
          />
        </label>

        {selected && (
          <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[10px] text-white/40">
            {t("contractLabel")}: {selected.contractAddress}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-white/35">{t("verifyHint")}</p>

        {error && (
          <p className="text-xs text-red-400">{t(ERROR_KEYS[error])}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!isConnected || loading || !tokenId.trim()}
            onClick={handleVerify}
            className="flex-1 rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
          >
            {loading ? t("verifying") : t("verifyAndAdd")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/60"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
