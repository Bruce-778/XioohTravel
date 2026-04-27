"use client";

import { useState } from "react";

type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
};

type HomeFaqSectionProps = {
  title: string;
  subtitle: string;
  items: HomeFaqItem[];
};

export function HomeFaqSection({ title, subtitle, items }: HomeFaqSectionProps) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  function toggleItem(itemId: string) {
    setOpenItemId((current) => (current === itemId ? null : itemId));
  }

  return (
    <section className="pb-20 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-elevated p-6 sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <h2 className="section-title">{title}</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            {items.map((item, index) => {
              const isOpen = openItemId === item.id;
              const panelId = `faq-panel-${item.id}`;

              return (
                <div
                  key={item.id}
                  className={`${index === items.length - 1 ? "" : "border-b border-slate-200"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:px-7 sm:py-6"
                  >
                    <span className="text-base sm:text-lg font-semibold leading-7 text-slate-900">
                      {item.question}
                    </span>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition ${
                        isOpen ? "rotate-180 text-brand-600 border-brand-200" : ""
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  <div
                    id={panelId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 sm:px-7 sm:pb-6 text-sm sm:text-base leading-7 text-slate-600">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
