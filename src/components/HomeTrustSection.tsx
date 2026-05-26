import Image from "next/image";
import { getT } from "@/lib/i18n";

function ServiceIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-12 w-12 shrink-0 flex-none rounded-2xl bg-gradient-to-br from-brand-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-brand-200/60">
      {children}
    </div>
  );
}

function StarRow() {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} className="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.719c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.951-.69l1.068-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export async function HomeTrustSection() {
  const { t } = await getT();

  const serviceItems = [
    {
      title: t("home.service.item.attire.title"),
      desc: t("home.service.item.attire.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.5 20.25a6.5 6.5 0 0113 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.25 13.5L12 16l1.75-2.5M12 16v4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.5 14.75l-1.25 3M15.5 14.75l1.25 3" />
        </svg>
      ),
    },
    {
      title: t("home.service.item.sign.title"),
      desc: t("home.service.item.sign.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6.75h12a1.5 1.5 0 011.5 1.5v6.25A1.5 1.5 0 0118 16H6a1.5 1.5 0 01-1.5-1.5V8.25A1.5 1.5 0 016 6.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10.5h8M8 13h5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16v2.5M16 16v2.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 4.75h6" />
        </svg>
      ),
    },
    {
      title: t("home.service.item.flight.title"),
      desc: t("home.service.item.flight.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 18l18-6L3 6l4.5 6L3 18z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.5 12H21" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.5 21.25c2.25.7 4.4.55 6.5-.45" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.75 19.25h.01" />
        </svg>
      ),
    },
    {
      title: t("home.service.item.cancel.title"),
      desc: t("home.service.item.cancel.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5.25a6.75 6.75 0 106.2 9.43" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8.25v4l2.25 1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.25 4.75h3v3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 4.75l-4.75 4.75" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.25 18.25l1.35 1.35 3.15-3.35" />
        </svg>
      ),
    },
    {
      title: t("home.service.item.luggage.title"),
      desc: t("home.service.item.luggage.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7V5.25A1.25 1.25 0 0110.25 4h3.5A1.25 1.25 0 0115 5.25V7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h10a1.5 1.5 0 011.5 1.5v8A2.5 2.5 0 0116 19H8a2.5 2.5 0 01-2.5-2.5v-8A1.5 1.5 0 017 7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 10.5v5M15 10.5v5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.5 20.25h.01M15.5 20.25h.01" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.25 10.75l1 1 2.25-2.5" />
        </svg>
      ),
    },
    {
      title: t("home.service.item.language.title"),
      desc: t("home.service.item.language.desc"),
      icon: (
        <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 5.5h9a2.5 2.5 0 012.5 2.5v3a2.5 2.5 0 01-2.5 2.5H9l-4.5 3.25V8A2.5 2.5 0 017 5.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5h2.5A2.5 2.5 0 0120 13v5.75l-3.25-2.25H13.5A2.5 2.5 0 0111 14" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10.75l1.25-3 1.25 3M8.35 10h1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.5 13.5h3" />
        </svg>
      ),
    },
  ];

  const reviewItems = [
    {
      quote: t("home.reviews.item.family.quote"),
      persona: t("home.reviews.item.family.persona"),
      route: t("home.reviews.item.family.route"),
    },
    {
      quote: t("home.reviews.item.firstTrip.quote"),
      persona: t("home.reviews.item.firstTrip.persona"),
      route: t("home.reviews.item.firstTrip.route"),
    },
    {
      quote: t("home.reviews.item.business.quote"),
      persona: t("home.reviews.item.business.persona"),
      route: t("home.reviews.item.business.route"),
    },
    {
      quote: t("home.reviews.item.lateNight.quote"),
      persona: t("home.reviews.item.lateNight.persona"),
      route: t("home.reviews.item.lateNight.route"),
    },
  ];

  const cases = [
    {
      title: t("home.cases.item.night.title"),
      summary: t("home.cases.item.night.summary"),
      imageSrc: "/home-services/serve-2.png",
      points: [
        t("home.cases.item.night.point1"),
        t("home.cases.item.night.point2"),
        t("home.cases.item.night.point3"),
      ],
    },
    {
      title: t("home.cases.item.family.title"),
      summary: t("home.cases.item.family.summary"),
      imageSrc: "/home-services/serve-3.png",
      points: [
        t("home.cases.item.family.point1"),
        t("home.cases.item.family.point2"),
        t("home.cases.item.family.point3"),
      ],
    },
    {
      title: t("home.cases.item.business.title"),
      summary: t("home.cases.item.business.summary"),
      imageSrc: "/home-services/serve-1.png",
      points: [
        t("home.cases.item.business.point1"),
        t("home.cases.item.business.point2"),
        t("home.cases.item.business.point3"),
      ],
    },
  ];

  return (
    <section className="pb-20 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        <div className="card-elevated p-6 sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t("home.cases.eyebrow")}
          </div>
          <h2 className="section-title mt-4">{t("home.cases.title")}</h2>
          <p className="section-subtitle max-w-3xl">{t("home.cases.subtitle")}</p>

          <div className="mt-8 grid lg:grid-cols-3 gap-5">
            {cases.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/15 to-transparent" />
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>

                  <div className="mt-5 space-y-3">
                    {item.points.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                <StarRow />
                <span>{t("home.reviews.eyebrow")}</span>
              </div>
              <h2 className="section-title mt-4">{t("home.reviews.title")}</h2>
              <p className="section-subtitle max-w-3xl">{t("home.reviews.subtitle")}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 min-w-[240px]">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-slate-900">5.0</div>
                <div>
                  <StarRow />
                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {t("home.reviews.ratingLabel")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {reviewItems.map((item) => (
              <div
                key={`${item.persona}-${item.route}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <StarRow />
                <p className="mt-4 text-sm leading-7 text-slate-700">“{item.quote}”</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-100">
                    {item.persona}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    {item.route}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6 sm:p-8 lg:p-10 overflow-hidden">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-50 via-sky-50 to-white blur-2xl opacity-80 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-100">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                {t("home.service.eyebrow")}
              </div>
              <h2 className="section-title mt-4">{t("home.service.title")}</h2>
              <p className="section-subtitle max-w-3xl">{t("home.service.subtitle")}</p>

              <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {serviceItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm hover:shadow-lg hover:border-brand-200 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <ServiceIcon>{item.icon}</ServiceIcon>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
