import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { QuantHub } from "@/components/quant/QuantHub";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quant" });
  return {
    title: `${t("title")} · Web3 Farm`,
    description: t("subtitle"),
  };
}

export default async function QuantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <QuantHub locale={locale} />;
}
