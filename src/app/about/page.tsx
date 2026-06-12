import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n";
import aboutUsHeroImage from "../../../Aboutus.png";
import aboutUsStoryImage from "../../../aboutus-2.png";

const HIGHLIGHT_ITEMS = [
  {
    key: "airport",
    imageSrc: "/home-services/serve-2.png",
  },
  {
    key: "price",
    imageSrc: "/vehicles/Alphard_vehicle.png",
  },
  {
    key: "support",
    imageSrc: "/home-services/serve-3.png",
  },
] as const;

const PROCESS_KEYS = ["book", "confirm", "meet", "arrive"] as const;

const CITY_ITEMS = [
  {
    key: "tokyo",
    imageSrc: "/home-promo/tokyo-coverpage.png",
  },
  {
    key: "kyoto",
    imageSrc: "/home-promo/kyoto-coverpage.png",
  },
  {
    key: "osaka",
    imageSrc: "/home-promo/osaka-coverpage.png",
  },
] as const;

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function AboutPage() {
  const { t } = await getT();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:px-8">
          <div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.08] text-slate-950 sm:text-5xl">
              {t("about.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {t("about.subtitle")}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              {t("about.heroBody")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#book-now"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                {t("about.bookNow")}
                <ArrowIcon />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
              >
                {t("about.contactSupport")}
              </Link>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["airports", "vehicles", "support"].map((key) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="whitespace-nowrap text-xl font-black text-slate-950 xl:text-2xl">
                    {t(`about.stat.${key}.value`)}
                  </div>
                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {t(`about.stat.${key}.label`)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden">
              <Image
                src={aboutUsHeroImage}
                alt={t("about.imageAlt")}
                fill
                priority
                sizes="(min-width: 1024px) 620px, calc(100vw - 32px)"
                className="scale-[1.012] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch lg:px-8">
          <div className="flex justify-center lg:justify-start lg:self-stretch">
            <Image
              src={aboutUsStoryImage}
              alt={t("about.storyImageAlt")}
              sizes="(min-width: 1024px) 480px, calc(100vw - 32px)"
              className="block h-auto w-full max-w-[520px] rounded-lg lg:h-full lg:w-auto lg:max-w-full"
            />
          </div>

          <div className="flex h-full flex-col">
            <div className="text-sm font-black uppercase text-emerald-700">
              {t("about.whatWeDoTitle")}
            </div>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              {t("about.storyTitle")}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              {t("about.whatWeDoBody")}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:flex-1 lg:auto-rows-fr">
              {PROCESS_KEYS.map((key, index) => (
                <article key={key} className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <h3 className="text-base font-black text-slate-950">
                      {t(`about.process.${key}.title`)}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {t(`about.process.${key}.body`)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-sm font-black uppercase text-amber-700">
              {t("about.serviceEyebrow")}
            </div>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:whitespace-nowrap">
              {t("about.serviceTitle")}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {t("about.serviceSubtitle")}
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {HIGHLIGHT_ITEMS.map((item) => (
              <article
                key={item.key}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg"
              >
                <div className="relative aspect-[16/11] bg-slate-100">
                  <Image
                    src={item.imageSrc}
                    alt={t(`about.highlight.${item.key}.imageAlt`)}
                    fill
                    sizes="(min-width: 1024px) 390px, calc(100vw - 32px)"
                    className={item.key === "price" ? "object-contain p-6" : "object-cover"}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-black text-slate-950">
                    {t(`about.highlight.${item.key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {t(`about.highlight.${item.key}.body`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div>
            <div>
              <div className="text-sm font-black uppercase text-sky-800">
                {t("about.coverageEyebrow")}
              </div>
              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:whitespace-nowrap">
                {t("about.coverageTitle")}
              </h2>
            </div>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {CITY_ITEMS.map((item) => (
              <article key={item.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-square bg-white">
                  <Image
                    src={item.imageSrc}
                    alt={t(`about.city.${item.key}.imageAlt`)}
                    fill
                    sizes="(min-width: 768px) 33vw, calc(100vw - 32px)"
                    className="object-contain"
                  />
                </div>
                <div className="border-t border-slate-100 p-5">
                  <h3 className="text-lg font-black text-slate-950">
                    {t(`about.city.${item.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(`about.city.${item.key}.body`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-slate-950 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.5fr_0.7fr] lg:items-center lg:gap-8 lg:px-8 xl:grid-cols-[1.32fr_0.68fr]">
          <div>
            <div className="text-sm font-black uppercase text-sky-700">
              {t("about.promiseEyebrow")}
            </div>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:whitespace-nowrap lg:text-[1.875rem] xl:text-[2rem] 2xl:text-4xl">
              {t("about.promiseTitle")}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              {t("about.promiseBody")}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["flight", "pickup", "luggage", "support"].map((key) => (
                <div key={key} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-800">
                    {t(`about.promise.${key}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-start">
            <div className="relative aspect-[4/3] w-full max-w-[560px]">
              <Image
                src="/vehicles/9seats_vehicle.png"
                alt={t("about.promiseImageAlt")}
                fill
                sizes="(min-width: 1024px) 430px, calc(100vw - 32px)"
                className="object-contain drop-shadow-[0_24px_24px_rgba(15,23,42,0.18)]"
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/#book-now"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-700"
              >
                {t("about.bookNow")}
                <ArrowIcon />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
              >
                {t("about.contactSupport")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
