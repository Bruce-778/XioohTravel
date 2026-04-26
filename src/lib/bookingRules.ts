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
  if (isUrgent) {
    return { ok: false as const, reason: "api.cancelUrgent" };
  }
  if (pickupTime.getTime() <= now.getTime()) {
    return { ok: false as const, reason: "api.cancelPast" };
  }
  return { ok: true as const, reason: null };
}

export function computeNightFee(pickupTime: Date) {
  // MVP：时间 22:00-06:00 收取夜间附加费（这里简化使用本地小时数）
  const h = pickupTime.getHours();
  return h >= 22 || h < 6;
}

