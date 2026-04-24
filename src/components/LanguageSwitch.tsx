"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LanguageSwitch({
  locale,
  labelLang,
  zhLabel,
  enLabel
}: {
  locale: "zh" | "en";
  labelLang: string;
  zhLabel: string;
  enLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function setLocale(next: "zh" | "en") {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next })
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 hidden sm:inline">{labelLang}</span>
      <div className="relative">
        <select
          value={locale}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await setLocale(e.target.value as "zh" | "en");
              router.refresh();
            })
          }
          className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors cursor-pointer disabled:opacity-50"
        >
          <option value="zh">{zhLabel}</option>
          <option value="en">{enLabel}</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

