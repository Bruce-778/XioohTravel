export const JAPAN_TZ = "Asia/Tokyo";
export const CHILD_SEAT_FEE_JPY = 1000; // 约合 50 CNY
export const MEET_AND_GREET_SIGN_FEE_JPY = 2000;

export function hoursBetween(nowMs: number, futureMs: number) {
  return (futureMs - nowMs) / (1000 * 60 * 60);
}

export function isUrgentOrder(now: Date, pickupTime: Date) {
  const diffHours = hoursBetween(now.getTime(), pickupTime.getTime());
  return diffHours < 24;
}

export function canUserCancel(now: Date, pickupTime: Date, isUrgent: boolean) {
  if (pickupTime.getTime() <= now.getTime()) {
    return { ok: false as const, reason: "api.cancelPast" };
  }
  if (isUrgent || isUrgentOrder(now, pickupTime)) {
    return { ok: false as const, reason: "api.cancelUrgent" };
  }
  return { ok: true as const, reason: null };
}

export function computeNightFee(pickupTime: Date) {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: JAPAN_TZ,
    }).format(pickupTime)
  );
  return h >= 22 || h < 6;
}
