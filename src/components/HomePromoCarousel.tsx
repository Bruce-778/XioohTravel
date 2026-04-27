"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type HomePromoSlide = {
  id: string;
  title: string;
  desc: string;
  imageSrc: string;
  alt: string;
};

type HomePromoCarouselProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  labels: {
    previous: string;
    next: string;
    goTo: string;
  };
  slides: HomePromoSlide[];
};

export function HomePromoCarousel({
  eyebrow,
  title,
  subtitle,
  cta,
  labels,
  slides,
}: HomePromoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (isPaused || slides.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = touchEndX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < 45) return;

    if (deltaX > 0) {
      showPrevious();
      return;
    }

    showNext();
  }

  return (
    <section className="pb-10 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-elevated overflow-hidden p-5 sm:p-7 lg:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {eyebrow}
            </div>
            <h2 className="section-title mt-4">{title}</h2>
            <p className="section-subtitle max-w-3xl">{subtitle}</p>
          </div>

          <div
            className="mt-8 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative h-[320px] sm:h-[420px] lg:h-[620px]">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                  aria-hidden={index !== activeIndex}
                >
                  <Image
                    src={slide.imageSrc}
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1280px) 1120px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
                    className="object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
                    <div className="flex items-end justify-between gap-4">
                      <div className="max-w-2xl">
                        <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                          {cta}
                        </div>
                        <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                          {slide.title}
                        </h3>
                        <p className="mt-3 max-w-xl text-sm sm:text-base leading-6 text-white/85">
                          {slide.desc}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white/80 backdrop-blur">
                        <span className="text-lg font-bold text-white">
                          {String(activeIndex + 1).padStart(2, "0")}
                        </span>
                        <span className="text-white/45">/</span>
                        <span>{String(slides.length).padStart(2, "0")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3 sm:px-5">
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label={labels.previous}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={showNext}
                  aria-label={labels.next}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/55 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-slate-950/95 px-4 py-4">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => showSlide(index)}
                  aria-label={`${labels.goTo} ${slide.title}`}
                  aria-pressed={index === activeIndex}
                  className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/60 ${
                    index === activeIndex ? "w-10 bg-white" : "w-2.5 bg-white/35 hover:bg-white/55"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
