// Client-side currency utilities (no next/headers)

import type { Currency } from "./currency";

function envNumber(name: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  // In browser, we can't access process.env, so use fixed rates
  return fallback;
}

export function convertFromJpy(amountJpy: number, currency: Currency) {
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
  const displayValue = isJpy ? Math.round(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(displayValue);
}
