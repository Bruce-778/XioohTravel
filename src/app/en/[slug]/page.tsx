import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adLandingPages, getAdLandingPage, type AdRoute } from "@/lib/adLandingPages";
import { formatJstDateTimeLocalValue } from "@/lib/timeFormat";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/+$/, "") || "https://xioohtravel.com";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return adLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getAdLandingPage(slug);
  if (!page) return {};
  const url = `${BASE_URL}/en/${page.slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "XioohTravel",
      type: "website",
      images: [{ url: page.heroImage, width: 1200, height: 1200, alt: page.heroAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [page.heroImage],
    },
  };
}

function createPickupTime() {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  date.setUTCHours(1, 0, 0, 0);
  return formatJstDateTimeLocalValue(date);
}

function buildVehiclesHref(route: AdRoute) {
  const params = new URLSearchParams({
    tripType: route.tripType,
    fromArea: route.fromArea,
    toArea: route.toArea,
    pickupTime: createPickupTime(),
    passengers: String(route.passengers),
    children: String(route.children),
    luggageSmall: String(route.luggageSmall),
    luggageMedium: String(route.luggageMedium),
  });

  return `/vehicles?${params.toString()}`;
}

export default async function EnglishAdLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getAdLandingPage(slug);
  if (!page) notFound();

  const primaryHref = page.primaryRoute ? buildVehiclesHref(page.primaryRoute) : "/#book-now";
  const pageUrl = `${BASE_URL}/en/${page.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: page.h1,
      description: page.description,
      provider: {
        "@type": "Organization",
        name: "XioohTravel",
        url: BASE_URL,
      },
      areaServed: page.serviceAreas.map((area) => ({ "@type": "Place", name: area })),
      serviceType: "Airport transfer and private driver service",
      url: pageUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <div className="bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <Image
          src={page.heroImage}
          alt={page.heroAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/60" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-200">{page.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{page.h1}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg">{page.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
              >
                {page.primaryCta}
              </Link>
              <Link
                href={page.slug === "japan-private-driver" ? "/contact" : "/vehicle-guide"}
                className="inline-flex rounded-lg border border-white/50 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                {page.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-6 lg:px-8">
          {page.serviceAreas.map((area) => (
            <div key={area} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              {area}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Why travelers book this route</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">A simple private transfer from search to checkout</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            XioohTravel is set up for travelers who want to choose a route, compare vehicles, and pay online without waiting for a manual quote.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {page.benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-950">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky-200">Vehicle fit</p>
          <div className="mt-5 space-y-4">
            {page.vehicleNotes.map((note) => (
              <div key={note.title} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                <h3 className="font-bold">{note.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{note.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/luggage-guide"
            className="mt-6 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            Check luggage capacity
          </Link>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Before you book</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Airport transfer questions</h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Ready to check vehicles and price?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Start with a route, passenger count, luggage, and pickup time in Japan Standard Time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {page.primaryCta}
          </Link>
          <Link
            href="/contact"
            className="inline-flex rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
          >
            Contact support
          </Link>
        </div>
      </section>
    </div>
  );
}
