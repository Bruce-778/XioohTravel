import { cookies, headers } from "next/headers";

export type Currency = "JPY" | "CNY" | "USD";

export const CURRENCY_COOKIE = "XioohTravel_currency";

export function normalizeCurrency(input: string | null | undefined): Currency {
  const v = (input ?? "").toUpperCase();
  if (v === "USD") return "USD";
  if (v === "CNY") return "CNY";
  return "JPY";
}

export async function getCurrency(): Promise<Currency> {
  const c = await cookies();
  const fromCookie = c.get(CURRENCY_COOKIE)?.value;
  if (fromCookie) return normalizeCurrency(fromCookie);
  const h = await headers();
  // default: if English, show USD; else JPY (simple heuristic)
  const accept = h.get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("en") ? "USD" : "JPY";
}

function envNumber(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function convertFromJpy(amountJpy: number, currency: Currency) {
  // Offline-safe fixed rates (override via env in production)
  const USD_PER_JPY = envNumber("USD_PER_JPY", 0.0067);
  const CNY_PER_JPY = envNumber("CNY_PER_JPY", 0.048);
  if (currency === "USD") return amountJpy * USD_PER_JPY;
  if (currency === "CNY") return amountJpy * CNY_PER_JPY;
  return amountJpy;
}

export function formatMoneyFromJpy(amountJpy: number, currency: Currency, locale: string) {
  const value = convertFromJpy(amountJpy, currency);
  const isJpy = currency === "JPY";
  const digits = isJpy ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

