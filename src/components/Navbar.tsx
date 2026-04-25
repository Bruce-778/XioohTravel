"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { useSession } from "@/hooks/useSession";
import { AuthLink } from "@/components/AuthLink";

const BRAND_NAME = "XioohTravel";

export function Navbar({
  locale,
  labels,
  currency
}: {
  locale: "zh" | "en";
  labels: {
    contact: string;
    orders: string;
    book: string;
    admin: string;
    lang: string;
    currency: string;
    zh: string;
    en: string;
    jpy: string;
    cny: string;
    usd: string;
    brandName: string;
    brandTagline: string;
    login: string;
    logout: string;
  };
  currency: "JPY" | "CNY" | "USD";
}) {
  const { user, loading } = useSession();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link 
            href="/" 
            className="group flex min-w-0 items-center gap-3 py-1 transition-opacity duration-200 hover:opacity-85"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl sm:h-12 sm:w-12">
              <Image
                src="/brand/xioohtravel-avatar.jpg"
                alt={BRAND_NAME}
                fill
                sizes="48px"
                priority
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black tracking-tight text-slate-950 sm:text-[1.35rem]">
                {BRAND_NAME}
              </div>
              <div className="truncate text-[11px] font-semibold leading-tight text-slate-500 sm:text-[13px]">
                {labels.brandTagline}
              </div>
            </div>
            <span className="sr-only">
              {BRAND_NAME} {labels.brandTagline}
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-4">
            <div className="flex items-center gap-1 mr-2 border-r border-slate-200 pr-2">
              <AuthLink 
                href="/" 
                className="px-3 py-2 rounded-lg text-brand-600 hover:bg-brand-50 font-bold transition-colors duration-200"
              >
                {labels.book}
              </AuthLink>
              <AuthLink 
                href="/orders" 
                className="hidden sm:block px-3 py-2 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors duration-200"
              >
                {labels.orders}
              </AuthLink>
              <AuthLink 
                href="/contact" 
                className="hidden md:block px-3 py-2 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors duration-200"
              >
                {labels.contact}
              </AuthLink>
            </div>

            <LanguageSwitch
              locale={locale}
              labelLang={labels.lang}
              zhLabel={labels.zh}
              enLabel={labels.en}
            />
            <CurrencySwitch
              currency={currency}
              label={labels.currency}
              items={[
                { code: "JPY", text: labels.jpy },
                { code: "CNY", text: labels.cny },
                { code: "USD", text: labels.usd }
              ]}
            />

            {!loading && (
              user ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-normal mr-1 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors duration-200"
                  >
                    {labels.logout}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/login`}
                  className="px-3 py-2 rounded-lg text-slate-700 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors duration-200"
                >
                  {labels.login}
                </Link>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
