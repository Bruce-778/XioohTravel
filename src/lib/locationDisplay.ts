import { getLocalizedLocation } from "@/lib/locationData";

export type OptionalAddressParams = {
  fromAddress?: string;
  toAddress?: string;
};

export function normalizeOptionalAddress(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function getOptionalStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  const rawValue = Array.isArray(value) ? value[0] : value;
  return normalizeOptionalAddress(rawValue);
}

export function appendOptionalAddressParams(
  params: URLSearchParams,
  addresses: OptionalAddressParams
) {
  const fromAddress = normalizeOptionalAddress(addresses.fromAddress);
  const toAddress = normalizeOptionalAddress(addresses.toAddress);

  if (fromAddress) {
    params.set("fromAddress", fromAddress);
  }
  if (toAddress) {
    params.set("toAddress", toAddress);
  }

  return params;
}

export function getDisplayLocation(
  area: string,
  address: string | undefined,
  locale: string
) {
  return normalizeOptionalAddress(address) ?? getLocalizedLocation(area, locale);
}
