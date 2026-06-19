import { setRequestLocale } from "next-intl/server";
import { TowerDefenseApp } from "@/components/td/TowerDefenseApp";

export default async function TdPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TowerDefenseApp locale={locale} />;
}
