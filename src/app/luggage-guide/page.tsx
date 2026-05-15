import Image from "next/image";
import { getT } from "@/lib/i18n";
import type { LuggageKind } from "@/components/LuggageCapacityDisplay";

type LuggageGuideItem = {
  kind: LuggageKind;
  name: string;
  size: string;
  imageSrc: string;
};

export default async function LuggageGuidePage() {
  const { t } = await getT();
  const items: LuggageGuideItem[] = [
    {
      kind: "small",
      name: t("luggage.carryOn"),
      size: t("luggage.carryOnSize"),
      imageSrc: "/luggage/carry-on.png",
    },
    {
      kind: "medium",
      name: t("luggage.mediumSuitcase"),
      size: t("luggage.mediumSize"),
      imageSrc: "/luggage/medium-suitcase.png",
    },
    {
      kind: "large",
      name: t("luggage.largeSuitcase"),
      size: t("luggage.largeSize"),
      imageSrc: "/luggage/large-suitcase.png",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
            {t("luggageGuide.eyebrow")}
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {t("luggageGuide.title")}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {t("luggageGuide.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.kind}
              className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm shadow-blue-100/50 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <a
                href={item.imageSrc}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.name} ${item.size}`}
                className="relative block h-80 bg-white sm:h-96 lg:h-[28rem]"
              >
                <Image
                  src={item.imageSrc}
                  alt={item.name}
                  fill
                  sizes="(min-width: 768px) 33vw, calc(100vw - 32px)"
                  className="object-contain p-1 sm:p-2"
                />
              </a>
              <div className="p-6 text-center">
                <h2 className="text-2xl font-black text-slate-950">
                  {item.name}
                  {" "}
                  <span className="text-brand-400">·</span>
                  {" "}
                  <span className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 align-middle text-sm font-black text-brand-700">
                    {item.size}
                  </span>
                </h2>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-slate-500">
          {t("luggageGuide.note")}
        </p>
      </div>
    </div>
  );
}
