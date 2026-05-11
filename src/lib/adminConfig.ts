import { timingSafeEqual } from "node:crypto";
import { normalizeEmailAddress } from "@/lib/email";

const DEFAULT_ADMIN_EMAIL = "bruce031103@gmail.com";

export function getAdminEmails() {
  const rawEmails = process.env.ADMIN_EMAILS?.trim() || DEFAULT_ADMIN_EMAIL;

  return rawEmails
    .split(",")
    .map((email) => normalizeEmailAddress(email))
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalizedEmail = normalizeEmailAddress(email);
  return getAdminEmails().includes(normalizedEmail);
}

export function getAdminSecret() {
  return process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET_KEY || "";
}

export function isAdminSecretConfigured() {
  return getAdminSecret().trim() !== "";
}

export function verifyAdminSecret(input: string | null | undefined) {
  const expected = getAdminSecret();
  const received = String(input ?? "");

  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
