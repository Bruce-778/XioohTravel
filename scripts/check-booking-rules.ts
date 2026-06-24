import { canCreateBooking, computeNightFee, isUrgentOrder } from "../src/lib/bookingRules";

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

function jstTimeToDate(date: string, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

expect(!computeNightFee(jstTimeToDate("2026-01-01", "20:59")), "20:59 JST should not be night");
expect(computeNightFee(jstTimeToDate("2026-01-01", "21:00")), "21:00 JST should be night");
expect(computeNightFee(jstTimeToDate("2026-01-01", "05:59")), "05:59 JST should be night");
expect(!computeNightFee(jstTimeToDate("2026-01-01", "06:00")), "06:00 JST should not be night");

const now = new Date("2026-01-01T00:00:00.000Z");
expect(!canCreateBooking(now, new Date(now.getTime() + 11.99 * 60 * 60 * 1000)), "under 12 hours should be blocked");
expect(canCreateBooking(now, new Date(now.getTime() + 12 * 60 * 60 * 1000)), "12 hours should be allowed");
expect(isUrgentOrder(now, new Date(now.getTime() + 23.99 * 60 * 60 * 1000)), "under 24 hours should be urgent");
expect(!isUrgentOrder(now, new Date(now.getTime() + 24 * 60 * 60 * 1000)), "24 hours should not be urgent");

if (failures.length > 0) {
  console.error("Booking rules check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Booking rules check passed.");
