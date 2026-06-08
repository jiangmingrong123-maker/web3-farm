import { setRequestLocale } from "next-intl/server";
import { PointsHall } from "@/components/farm/PointsHall";

export default async function FarmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PointsHall locale={locale} />;
}
