import { SearchForm } from "@/components/SearchForm";
import { AuthLink } from "@/components/AuthLink";
import { HomeFaqSection } from "@/components/HomeFaqSection";
import { HomePromoGallery } from "@/components/HomePromoGallery";
import { HomeTrustSection } from "@/components/HomeTrustSection";
import { getT } from "@/lib/i18n";

export default async function HomePage() {
  const { t, locale } = await getT();
  const promoSlides = [
    {
      id: "tokyo",
      imageSrc: "/home-promo/tokyo-coverpage.png",
      alt: t("home.promo.tokyo.alt"),
    },
    {
      id: "kyoto",
      imageSrc: "/home-promo/kyoto-coverpage.png",
      alt: t("home.promo.kyoto.alt"),
    },
    {
      id: "osaka",
      imageSrc: "/home-promo/osaka-coverpage.png",
      alt: t("home.promo.osaka.alt"),
    },
  ];
  const faqItems = [
    {
      id: "book-for-others",
      question: t("home.faq.items.bookForOthers.question"),
      answer: t("home.faq.items.bookForOthers.answer"),
    },
    {
      id: "round-trip",
      question: t("home.faq.items.roundTrip.question"),
      answer: t("home.faq.items.roundTrip.answer"),
    },
    {
      id: "luggage",
      question: t("home.faq.items.luggage.question"),
      answer: t("home.faq.items.luggage.answer"),
    },
    {
      id: "flight-change",
      question: t("home.faq.items.flightChange.question"),
      answer: t("home.faq.items.flightChange.answer"),
    },
    {
      id: "find-driver",
      question: t("home.faq.items.findDriver.question"),
      answer: t("home.faq.items.findDriver.answer"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-brand-200/50 shadow-sm text-sm font-medium text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              {t("home.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {t("home.title")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
              {t("home.subtitle")}
            </p>

            {/* Feature Chips */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="badge">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("home.chip.urgent")}
              </div>
              <div className="badge">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t("home.chip.vehicles")}
              </div>
              <div className="badge">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {t("home.chip.support")}
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-4">
              <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-4 h-px bg-slate-300"></span>
                {t("home.tryRoutes")}
              </p>
              <div className="flex flex-wrap gap-3">
                <AuthLink
                  className="group px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:border-brand-300 hover:text-brand-600 shadow-sm transition-all duration-200"
                  href="/vehicles?tripType=PICKUP&fromArea=NRT&toArea=Shinjuku&pickupTime=2026-02-01T10:00&passengers=2&luggageSmall=1&luggageMedium=0&luggageLarge=0"
                >
                  {t("home.route.naritaShinjuku")}
                </AuthLink>
                <AuthLink
                  className="group px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:border-brand-300 hover:text-brand-600 shadow-sm transition-all duration-200"
                  href="/vehicles?tripType=PICKUP&fromArea=HND&toArea=Shibuya&pickupTime=2026-02-01T22:30&passengers=3&luggageSmall=1&luggageMedium=1&luggageLarge=0"
                >
                  {t("home.route.hanedaShibuya")}
                </AuthLink>
              </div>
            </div>
          </div>

          {/* Right - Search Form */}
          <div className="relative animate-slide-up lg:sticky lg:top-24">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative card-elevated p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-xl text-slate-900">{t("home.search.title")}</h2>
                  <p className="text-sm text-slate-500">{t("home.search.subtitle")}</p>
                </div>
              </div>
              <div className="mt-6">
                <SearchForm
                  locale={locale}
                  labels={{
                    pickup: t("search.pickup"),
                    dropoff: t("search.dropoff"),
                    p2p: t("search.p2p"),
                    from: t("search.from"),
                    to: t("search.to"),
                    pickupTime: t("search.pickupTime"),
                    passengers: t("search.passengers"),
                    childSeats: t("search.childSeats"),
                    luggageSmall: t("search.luggageSmall"),
                    luggageMedium: t("search.luggageMedium"),
                    luggageLarge: t("search.luggageLarge"),
                    submit: t("search.submit"),
                    timezoneHint: t("search.timezoneHint"),
                    fromAirport: t("search.fromAirport"),
                    fromLocation: t("search.fromLocation"),
                    toAirport: t("search.toAirport"),
                    toLocation: t("search.toLocation"),
                    selectAirport: t("search.selectAirport"),
                    selectLocation: t("search.selectLocation"),
                    placeholderAirport: t("search.placeholderAirport"),
                    placeholderLocation: t("search.placeholderLocation"),
                    locationTip: t("search.locationTip"),
                    selectedTime: t("search.selectedTime"),
                    locationSearching: t("location.searching"),
                    locationNoResults: t("location.noResults"),
                    locationGoogleConfigError: t("location.googleConfigError"),
                    locationGooglePowered: t("location.googlePowered"),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <HomePromoGallery
        eyebrow={t("home.promo.eyebrow")}
        title={t("home.promo.title")}
        slides={promoSlides}
      />
      <HomeTrustSection />
      <HomeFaqSection
        title={t("home.faq.title")}
        subtitle={t("home.faq.subtitle")}
        items={faqItems}
      />
    </div>
  );
}
