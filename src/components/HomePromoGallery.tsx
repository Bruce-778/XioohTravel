import Image from "next/image";

type HomePromoSlide = {
  id: string;
  imageSrc: string;
  alt: string;
};

type HomePromoGalleryProps = {
  eyebrow: string;
  title: string;
  slides: HomePromoSlide[];
};

export function HomePromoGallery({
  eyebrow,
  title,
  slides,
}: HomePromoGalleryProps) {
  return (
    <section className="pb-10 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-elevated overflow-hidden p-5 sm:p-7 lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {eyebrow}
            </div>
            <h2 className="section-title mt-4">{title}</h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-square overflow-hidden bg-white">
                  <Image
                    src={slide.imageSrc}
                    alt={slide.alt}
                    fill
                    sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
                    className="object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
