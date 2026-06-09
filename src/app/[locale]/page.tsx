import { getTranslations, setRequestLocale } from "next-intl/server";
import { COLLECTIONS } from "@/config/collections";
import { CollectionCard } from "@/components/CollectionCard";
import { FarmEntryCard } from "@/components/home/FarmEntryCard";
import { SwapEntryCard } from "@/components/home/SwapEntryCard";
import { TierPreviewCard } from "@/components/TierPreviewCard";
import { TierTable } from "@/components/TierTable";
import { evaluateRarity } from "@/lib/rarity/engine";
import {
  NOBODY_6037_ATTRIBUTES,
  NOBODY_6037_TOKEN_ID,
} from "@/lib/samples/nobody-6037";
import { loadTraitStats } from "@/lib/trait-stats";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const nobody = COLLECTIONS[0];
  const traitStats = loadTraitStats(nobody.traitRarityTableId);
  const preview = evaluateRarity("nobody_v1", {
    attributes: NOBODY_6037_ATTRIBUTES,
    traitStats,
  });

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="mb-3 text-xs tracking-[0.25em] text-gold/80">{t("badge")}</p>
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          {t("subtitle")}
        </p>
        <p className="mt-3 text-xs text-white/35">{t("phase")}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <FarmEntryCard />
        <SwapEntryCard />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 text-lg font-bold">{t("tierTitle")}</h2>
          <p className="mb-4 text-sm text-white/45">{t("tierSubtitle")}</p>
          <TierTable locale={locale} highlightTier={preview.tier} />
        </div>

        <div>
          <h2 className="mb-1 text-lg font-bold">{t("previewTitle")}</h2>
          <p className="mb-4 text-sm text-white/45">{t("previewHint")}</p>
          <TierPreviewCard
            locale={locale}
            tokenId={NOBODY_6037_TOKEN_ID}
            result={preview}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">{t("collectionsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLLECTIONS.map((c) => (
            <CollectionCard key={c.slug} collection={c} />
          ))}
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/35">
            {t("comingSoon")}
          </div>
        </div>
      </section>
    </div>
  );
}
