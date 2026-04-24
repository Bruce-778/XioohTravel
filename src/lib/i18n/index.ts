import { cookies } from "next/headers";
import { dicts, type Locale } from "./dicts";

export const LOCALE_COOKIE = "XioohTravel_locale";

export function normalizeLocale(input: string | null | undefined): Locale {
  const v = (input ?? "").toLowerCase();
  if (v.startsWith("en")) return "en";
  return "zh";
}

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return normalizeLocale(fromCookie);
  return "en";
}

export async function getT() {
  const locale = await getLocale();
  const d = dicts[locale] ?? dicts.en;
  function t(key: string) {
    if (locale === "en") {
      return d[key] ?? key;
    }
    return d[key] ?? dicts.en[key] ?? key;
  }
  return { locale, t };
}
