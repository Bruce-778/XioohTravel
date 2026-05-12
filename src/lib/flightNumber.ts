export const FLIGHT_NUMBER_PATTERN = /^([A-Z0-9]{2,3})\s?\d{1,4}[A-Z]?$/;

export function normalizeFlightNumberInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

export function normalizeFlightNumber(value: string) {
  return normalizeFlightNumberInput(value).trim();
}

export function isValidFlightNumber(value: string) {
  const normalized = normalizeFlightNumber(value);
  const match = normalized.match(FLIGHT_NUMBER_PATTERN);
  return Boolean(match && /[A-Z]/.test(match[1]));
}
