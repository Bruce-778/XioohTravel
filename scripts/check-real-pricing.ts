import { generateRealPricingRules, REAL_SURCHARGE_JPY } from "../src/lib/realPricing";
import { TOKYO_WARD_PRICING_CODES } from "../src/lib/pricingZones";

const rules = generateRealPricingRules();
const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

function findRule(fromArea: string, toArea: string, tripType: string, vehicleTypeId: string) {
  return rules.find(
    (rule) =>
      rule.fromArea === fromArea &&
      rule.toArea === toArea &&
      rule.tripType === tripType &&
      rule.vehicleTypeId === vehicleTypeId
  );
}

expect(rules.length === 520, `expected 520 rules, got ${rules.length}`);
expect(rules.every((rule) => rule.sourceVehicle !== "seat14"), "generated active rule from Excel 14-seat source");
expect(rules.every((rule) => rule.nightFeeJpy === REAL_SURCHARGE_JPY), "night fee mismatch");
expect(rules.every((rule) => rule.urgentFeeJpy === REAL_SURCHARGE_JPY), "urgent fee mismatch");
expect(!rules.some((rule) => rule.toArea === "Shinjuku" || rule.fromArea === "Shinjuku"), "old Shinjuku pricing code exists");

for (const ward of TOKYO_WARD_PRICING_CODES) {
  for (const airport of ["NRT", "HND"]) {
    for (const vehicleTypeId of ["economy_5", "business_7", "large_9", "luxury_vip", "bus_group"]) {
      expect(Boolean(findRule(airport, ward, "PICKUP", vehicleTypeId)), `missing pickup ${airport} -> ${ward} for ${vehicleTypeId}`);
      expect(Boolean(findRule(ward, airport, "DROPOFF", vehicleTypeId)), `missing dropoff ${ward} -> ${airport} for ${vehicleTypeId}`);
    }
  }
}

expect(findRule("NRT", "TOKYO_SHINJUKU", "PICKUP", "economy_5")?.basePriceJpy === 13134, "NRT -> TOKYO_SHINJUKU economy price mismatch");
expect(findRule("HND", "TOKYO_CHUO", "PICKUP", "economy_5")?.basePriceJpy === 6716, "HND -> TOKYO_CHUO economy price mismatch");
expect(findRule("NRT", "TOKYO_CHIYODA", "PICKUP", "luxury_vip")?.basePriceJpy === 14179, "NRT -> TOKYO_CHIYODA luxury price mismatch");
expect(findRule("ITM", "KYOTO_CITY", "PICKUP", "bus_group")?.basePriceJpy === 44776, "ITM -> KYOTO_CITY group price mismatch");

if (failures.length > 0) {
  console.error("Real pricing check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Real pricing check passed (${rules.length} rules).`);
