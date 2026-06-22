export type AdRoute = {
  tripType: "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
  fromArea: string;
  toArea: string;
  passengers: number;
  children: number;
  luggageSmall: number;
  luggageMedium: number;
};

export type AdLandingPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  heroImage: string;
  heroAlt: string;
  primaryRoute?: AdRoute;
  primaryCta: string;
  secondaryCta: string;
  serviceAreas: string[];
  benefits: Array<{ title: string; body: string }>;
  vehicleNotes: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

const commonFaqs = [
  {
    question: "What happens if my flight is delayed?",
    answer:
      "Share your flight number during checkout. The support team can review updated arrival information and help adjust meeting instructions when availability allows.",
  },
  {
    question: "Where do I meet the driver?",
    answer:
      "Meeting details depend on the airport terminal and the meet-and-greet option. You will receive clear pickup guidance after the booking is confirmed.",
  },
  {
    question: "Can I book a child seat or meet-and-greet sign?",
    answer:
      "Yes. Child seats and a meet-and-greet sign can be selected during checkout when available for the vehicle and route.",
  },
  {
    question: "Can I pay online with an international card?",
    answer:
      "The checkout is built around secure Stripe payment. Once the production payment settings are complete, travelers can pay online with supported international cards such as Visa.",
  },
];

const airportBenefits = [
  {
    title: "Door-to-door pickup",
    body: "Travel from the airport terminal to your hotel, apartment, station, or meeting point without switching trains with luggage.",
  },
  {
    title: "Vehicle options",
    body: "Choose practical 5, 7, or 9 seater options based on passengers, children, and luggage.",
  },
  {
    title: "Clear online booking",
    body: "Search a route, compare vehicles, enter contact and flight details, then continue to secure checkout.",
  },
];

const vehicleNotes = [
  {
    title: "5 seater",
    body: "Best for solo travelers, couples, and light luggage airport arrivals.",
  },
  {
    title: "7 seater",
    body: "A comfortable fit for families or small groups who need more cabin and luggage space.",
  },
  {
    title: "9 seater",
    body: "Useful for groups, extra luggage, or travelers who prefer more room after a long flight.",
  },
];

export const adLandingPages: AdLandingPage[] = [
  {
    slug: "tokyo-airport-transfer",
    title: "Tokyo Airport Transfer | Narita & Haneda Private Pickup",
    description:
      "Book Tokyo airport transfers from Narita or Haneda to Shinjuku, Shibuya, Ginza and more. Fixed route pricing, 5/7/9 seater options and English support.",
    h1: "Tokyo Airport Transfer",
    eyebrow: "Narita and Haneda private pickup",
    intro:
      "Reserve a private transfer between Tokyo airports and the city. XioohTravel helps travelers move from Narita or Haneda to Tokyo hotels with clear vehicle options and online checkout.",
    heroImage: "/home-promo/tokyo-coverpage.png",
    heroAlt: "Tokyo travel cover with city skyline and Mount Fuji",
    primaryRoute: {
      tripType: "PICKUP",
      fromArea: "NRT T1",
      toArea: "Shinjuku",
      passengers: 2,
      children: 0,
      luggageSmall: 1,
      luggageMedium: 1,
    },
    primaryCta: "Book Tokyo transfer",
    secondaryCta: "Check vehicle options",
    serviceAreas: ["Narita Airport", "Haneda Airport", "Shinjuku", "Shibuya", "Ginza", "Ueno"],
    benefits: airportBenefits,
    vehicleNotes,
    faqs: commonFaqs,
  },
  {
    slug: "narita-airport-transfer",
    title: "Narita Airport Transfer | NRT To Tokyo Private Car",
    description:
      "Book a private Narita Airport transfer to Tokyo hotels and city areas. Compare 5/7/9 seater vehicles, luggage capacity and secure checkout.",
    h1: "Narita Airport Transfer",
    eyebrow: "NRT private car to Tokyo",
    intro:
      "Make arrival at Narita smoother with a private car from the terminal to Tokyo. Choose a vehicle for your group size and luggage before checkout.",
    heroImage: "/home-promo/tokyo-coverpage.png",
    heroAlt: "Tokyo travel cover for Narita Airport transfers",
    primaryRoute: {
      tripType: "PICKUP",
      fromArea: "NRT T1",
      toArea: "Shinjuku",
      passengers: 2,
      children: 0,
      luggageSmall: 1,
      luggageMedium: 1,
    },
    primaryCta: "Book Narita pickup",
    secondaryCta: "View luggage guide",
    serviceAreas: ["NRT Terminal 1", "NRT Terminal 2", "NRT Terminal 3", "Shinjuku", "Ginza", "Asakusa"],
    benefits: airportBenefits,
    vehicleNotes,
    faqs: commonFaqs,
  },
  {
    slug: "haneda-airport-transfer",
    title: "Haneda Airport Transfer | HND To Tokyo Private Pickup",
    description:
      "Reserve Haneda Airport transfers to Shibuya, Shinjuku, Ginza and Tokyo hotels. Private pickup, English support and multiple vehicle sizes.",
    h1: "Haneda Airport Transfer",
    eyebrow: "HND pickup for Tokyo arrivals",
    intro:
      "Book a private Haneda transfer for a direct ride from the airport to central Tokyo. It is a simple option for late arrivals, families and business travelers.",
    heroImage: "/home-promo/tokyo-coverpage.png",
    heroAlt: "Tokyo travel cover for Haneda Airport transfers",
    primaryRoute: {
      tripType: "PICKUP",
      fromArea: "HND T3",
      toArea: "Shibuya",
      passengers: 2,
      children: 0,
      luggageSmall: 1,
      luggageMedium: 1,
    },
    primaryCta: "Book Haneda pickup",
    secondaryCta: "Contact support",
    serviceAreas: ["HND Terminal 1", "HND Terminal 2", "HND Terminal 3", "Shibuya", "Shinjuku", "Tokyo Station"],
    benefits: airportBenefits,
    vehicleNotes,
    faqs: commonFaqs,
  },
  {
    slug: "kansai-airport-transfer",
    title: "Kansai Airport Transfer | KIX To Osaka Private Car",
    description:
      "Book Kansai Airport transfers from KIX to Osaka, Namba, Umeda and Kyoto. Private vehicle options for families, groups and business travelers.",
    h1: "Kansai Airport Transfer",
    eyebrow: "KIX private pickup to Osaka and Kyoto",
    intro:
      "Move from Kansai International Airport to Osaka or Kyoto with a private transfer. Compare vehicle sizes and luggage capacity before booking.",
    heroImage: "/home-promo/osaka-coverpage.png",
    heroAlt: "Osaka travel cover with Osaka Castle and skyline",
    primaryRoute: {
      tripType: "PICKUP",
      fromArea: "KIX T1",
      toArea: "Namba",
      passengers: 2,
      children: 0,
      luggageSmall: 1,
      luggageMedium: 1,
    },
    primaryCta: "Book Kansai pickup",
    secondaryCta: "See driver support",
    serviceAreas: ["KIX Terminal 1", "KIX Terminal 2", "Namba", "Umeda", "Dotonbori", "Kyoto Station"],
    benefits: airportBenefits,
    vehicleNotes,
    faqs: commonFaqs,
  },
  {
    slug: "osaka-airport-transfer",
    title: "Osaka Airport Transfer | KIX To Namba And Umeda",
    description:
      "Reserve private Osaka airport transfers from Kansai Airport to Namba, Umeda, Dotonbori and nearby hotels with online booking.",
    h1: "Osaka Airport Transfer",
    eyebrow: "Private airport pickup for Osaka stays",
    intro:
      "Book a private ride from Kansai Airport to Osaka hotels and popular districts. It is useful when traveling with luggage, children, or a tight schedule.",
    heroImage: "/home-promo/osaka-coverpage.png",
    heroAlt: "Osaka travel cover for private airport transfers",
    primaryRoute: {
      tripType: "PICKUP",
      fromArea: "KIX T1",
      toArea: "Umeda",
      passengers: 3,
      children: 0,
      luggageSmall: 1,
      luggageMedium: 1,
    },
    primaryCta: "Book Osaka pickup",
    secondaryCta: "Compare luggage capacity",
    serviceAreas: ["Kansai Airport", "Namba", "Umeda", "Dotonbori", "Osaka Station", "Universal City"],
    benefits: airportBenefits,
    vehicleNotes,
    faqs: commonFaqs,
  },
  {
    slug: "japan-private-driver",
    title: "Japan Private Driver | Airport Transfers And Private Car Service",
    description:
      "Book Japan private driver service for airport transfers and city-to-city travel in Tokyo, Osaka and Kyoto. Vehicle options and English support.",
    h1: "Japan Private Driver",
    eyebrow: "Private car service for Japan travel",
    intro:
      "Arrange private driver support for Japan airport transfers, hotel pickup and custom point-to-point rides. Start with your route and choose a vehicle that fits your group.",
    heroImage: "/home-promo/kyoto-coverpage.png",
    heroAlt: "Kyoto travel cover for Japan private driver service",
    primaryCta: "Start booking",
    secondaryCta: "Ask support",
    serviceAreas: ["Tokyo", "Osaka", "Kyoto", "Narita Airport", "Haneda Airport", "Kansai Airport"],
    benefits: [
      {
        title: "Flexible routes",
        body: "Use airport transfer, drop-off, or point-to-point booking depending on your travel day.",
      },
      {
        title: "Group-friendly vehicles",
        body: "Choose vehicle sizes around passenger count, child seats, and luggage volume.",
      },
      {
        title: "Support before pickup",
        body: "Contact support if you need help checking vehicle fit, meeting details, or route availability.",
      },
    ],
    vehicleNotes,
    faqs: commonFaqs,
  },
];

export function getAdLandingPage(slug: string) {
  return adLandingPages.find((page) => page.slug === slug) ?? null;
}
