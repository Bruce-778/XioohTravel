import { cookies, headers } from "next/headers";
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
  const h = await headers();
  const accept = h.get("accept-language");
  return normalizeLocale(accept ?? "zh");
}

export async function getT() {
  const locale = await getLocale();
  const d = dicts[locale] ?? dicts.zh;
  function t(key: string) {
    return d[key] ?? dicts.zh[key] ?? key;
  }
  return { locale, t };
}

