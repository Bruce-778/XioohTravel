import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { getT } from "@/lib/i18n";
import { getCurrency } from "@/lib/currency";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/+$/, "") || "https://xioohtravel.com";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const title = `${t("brand.name")} - ${t("brand.tagline")}`;
  const description = t("home.subtitle");

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: `%s | ${t("brand.name")}`,
    },
    description,
    openGraph: {
      title,
      description,
      url: BASE_URL,
      siteName: t("brand.name"),
      type: "website",
      images: [{ url: "/brand/favicon-192.png", width: 192, height: 192 }],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    icons: {
      icon: [
        { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
        { url: "/brand/favicon-192.png", type: "image/png", sizes: "192x192" }
      ],
      shortcut: [{ url: "/brand/favicon-32.png", type: "image/png" }],
      apple: [{ url: "/brand/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
    }
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
          <Footer />
          <MobileNav 
            labels={{
              home: t("nav.home"),
              orders: t("nav.orders"),
              contact: t("nav.contact"),
              login: t("nav.login"),
              logout: t("nav.logout")
            }}
          />
        </div>
      </body>
    </html>
  );
}
