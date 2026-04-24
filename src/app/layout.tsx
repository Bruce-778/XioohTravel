import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { getT } from "@/lib/i18n";
import { getCurrency } from "@/lib/currency";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: `${t("brand.name")} - ${t("brand.tagline")}`,
    description: t("home.subtitle")
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  const currency = await getCurrency();
  return (
    <html lang={locale === "en" ? "en" : "zh-CN"}>
      <body>
        <div className="min-h-screen flex flex-col">
          <Navbar
            locale={locale}
            labels={{
              contact: t("nav.contact"),
              orders: t("nav.orders"),
              book: t("nav.book"),
              admin: t("nav.admin"),
              lang: t("nav.lang"),
              currency: t("nav.currency"),
              zh: t("lang.zh"),
              en: t("lang.en"),
              jpy: t("currency.jpy"),
              cny: t("currency.cny"),
              usd: t("currency.usd"),
              brandName: t("brand.name"),
              brandTagline: t("brand.tagline"),
              login: t("nav.login"),
              logout: t("nav.logout")
            }}
            currency={currency}
          />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <MobileNav 
            labels={{
              home: t("nav.home"),
              orders: t("nav.orders"),
              contact: t("nav.contact")
            }}
          />
        </div>
      </body>
    </html>
  );
}

