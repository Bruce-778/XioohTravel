import { getPricingAreaCodeFromCandidates } from "../src/lib/locationData";
import { generateRealPricingRules } from "../src/lib/realPricing";

const rules = generateRealPricingRules();

type FlowCase = {
  name: string;
  fromArea: string;
  toArea: string;
  fromAddress?: string;
  toAddress?: string;
  tripType: "PICKUP" | "DROPOFF";
  expectedFrom: string;
  expectedTo: string;
  expectedEconomyJpy?: number;
  expectedLuxuryJpy?: number;
  shouldHavePrice: boolean;
};

const cases: FlowCase[] = [
  {
    name: "NRT pickup to Shinjuku hotel",
    fromArea: "NRT T1 - Narita International Airport Terminal 1",
    toArea: "Hotel Groove Shinjuku",
    toAddress: "Kabukicho, Shinjuku City, Tokyo, Japan",
    tripType: "PICKUP",
    expectedFrom: "NRT",
    expectedTo: "TOKYO_SHINJUKU",
    expectedEconomyJpy: 13134,
    shouldHavePrice: true,
  },
  {
    name: "HND pickup to Ginza hotel",
    fromArea: "HND T3 - Haneda Airport Terminal 3",
    toArea: "Ginza hotel",
    toAddress: "Tokyo, Chuo City, Ginza, 7 Chome, Japan",
    tripType: "PICKUP",
    expectedFrom: "HND",
    expectedTo: "TOKYO_CHUO",
    expectedEconomyJpy: 6716,
    shouldHavePrice: true,
  },
  {
    name: "NRT pickup to Tokyo Station",
    fromArea: "NRT T2 - Narita International Airport Terminal 2",
    toArea: "Tokyo Station",
    toAddress: "Marunouchi, Chiyoda City, Tokyo, Japan",
    tripType: "PICKUP",
    expectedFrom: "NRT",
    expectedTo: "TOKYO_CHIYODA",
    expectedLuxuryJpy: 14179,
    shouldHavePrice: true,
  },
  {
    name: "Ikebukuro dropoff to HND",
    fromArea: "Ikebukuro",
    fromAddress: "Toshima City, Tokyo, Japan",
    toArea: "HND T3 - Haneda Airport Terminal 3",
    tripType: "DROPOFF",
    expectedFrom: "TOKYO_TOSHIMA",
    expectedTo: "HND",
    expectedEconomyJpy: 6716,
    shouldHavePrice: true,
  },
  {
    name: "ITM pickup to Kyoto Station",
    fromArea: "ITM T1 - Itami Airport Terminal",
    toArea: "Kyoto Station",
    toAddress: "Higashishiokoji Kamadonocho, Shimogyo Ward, Kyoto, Japan",
    tripType: "PICKUP",
    expectedFrom: "ITM",
    expectedTo: "KYOTO_CITY",
    expectedEconomyJpy: 14925,
    shouldHavePrice: true,
  },
  {
    name: "Unsupported Fuji destination",
    fromArea: "NRT T1 - Narita International Airport Terminal 1",
    toArea: "Lake Kawaguchi",
    toAddress: "Fujikawaguchiko, Yamanashi, Japan",
    tripType: "PICKUP",
    expectedFrom: "NRT",
    expectedTo: "Lake Kawaguchi",
    shouldHavePrice: false,
  },
];

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

for (const item of cases) {
  const fromCode = getPricingAreaCodeFromCandidates(item.fromArea, item.fromAddress);
  const toCode = getPricingAreaCodeFromCandidates(item.toArea, item.toAddress);
  const routeRules = rules.filter(
    (rule) =>
      rule.fromArea === fromCode &&
      rule.toArea === toCode &&
      rule.tripType === item.tripType
  );

  expect(fromCode === item.expectedFrom, `${item.name}: expected from ${item.expectedFrom}, got ${fromCode}`);
  expect(toCode === item.expectedTo, `${item.name}: expected to ${item.expectedTo}, got ${toCode}`);
  expect((routeRules.length > 0) === item.shouldHavePrice, `${item.name}: price availability mismatch`);

  if (item.expectedEconomyJpy != null) {
    const economy = routeRules.find((rule) => rule.vehicleTypeId === "economy_5");
    expect(economy?.basePriceJpy === item.expectedEconomyJpy, `${item.name}: economy price mismatch`);
  }

  if (item.expectedLuxuryJpy != null) {
    const luxury = routeRules.find((rule) => rule.vehicleTypeId === "luxury_vip");
    expect(luxury?.basePriceJpy === item.expectedLuxuryJpy, `${item.name}: luxury price mismatch`);
  }
}

if (failures.length > 0) {
  console.error("User pricing flow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`User pricing flow check passed (${cases.length} cases).`);
