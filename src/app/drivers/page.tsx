import type { Metadata } from "next";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("drivers.title"), description: t("drivers.subtitle") };
}

const LANGUAGE_KEYS = [
  "drivers.languageChinese",
  "drivers.languageEnglish",
  "drivers.languageJapanese",
];

const SERVICE_KEYS = [
  "drivers.service.flight",
  "drivers.service.meeting",
  "drivers.service.route",
  "drivers.service.sign",
  "drivers.service.luggage",
  "drivers.service.family",
];

export default async function DriversPage() {
  const { t } = await getT();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
            {t("drivers.eyebrow")}
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {t("drivers.title")}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {t("drivers.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {LANGUAGE_KEYS.map((key) => (
            <div key={key} className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h2 className="text-xl font-black text-slate-950">{t(key)}</h2>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">{t("drivers.servicesTitle")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {SERVICE_KEYS.map((key) => (
              <div key={key} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-500">{t("drivers.note")}</p>
        </div>
      </div>
    </div>
  );
}
