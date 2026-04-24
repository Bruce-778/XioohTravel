"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { useSession } from "@/hooks/useSession";
import { AuthLink } from "@/components/AuthLink";

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
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white grid place-items-center font-bold text-lg shadow-lg">
                TG
              </div>
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-bold text-slate-900 text-lg">{labels.brandName}</div>
              <div className="text-xs text-slate-500 font-medium">{labels.brandTagline}</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
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
