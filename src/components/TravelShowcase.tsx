import Image from "next/image";
import { getT } from "@/lib/i18n";

export async function TravelShowcase() {
  const { t } = await getT();
  const cards = [
    {
      title: t("showcase.tokyo.title"),
      src: "/myorders/myorders_1.png"
    },
    {
      title: t("showcase.kyoto.title"),
      src: "/myorders/myorders_2.png"
    },
    {
      title: t("showcase.osaka.title"),
      src: "/myorders/myorders_3.png"
    }
  ];

  return (
    <section className="mt-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="text-sm text-slate-500">{t("brand.name")}</div>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">
          {t("showcase.title")}
        </h3>
        <div className="mt-2 text-sm text-slate-600">
          {t("showcase.subtitle")}
        </div>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
              <div className="relative aspect-[4/3]">
                <Image
                  src={c.src}
                  alt={c.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
