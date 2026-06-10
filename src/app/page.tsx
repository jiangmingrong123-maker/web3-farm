import { redirect } from "next/navigation";

/** Dev + static export: send `/` to default locale. Production also uses public/_redirects. */
export default function RootPage() {
  redirect("/zh/");
}
