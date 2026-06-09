import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SwapPageClient } from "./SwapPageClient";

export default async function SwapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-white/40">Loading…</div>
      }
    >
      <SwapPageClient />
    </Suspense>
  );
}
