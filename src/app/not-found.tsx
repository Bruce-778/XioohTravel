import Link from "next/link";
import { getT } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getT();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-black text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("notFound.desc")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
        >
          {t("vehicles.goHome")}
        </Link>
      </div>
    </div>
  );
}
