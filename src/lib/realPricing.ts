import { TOKYO_WARD_PRICING_CODES } from "./pricingZones";

export const REAL_PRICING_USD_PER_JPY = 0.0067;
export const REAL_SURCHARGE_USD = 14;
export const REAL_SURCHARGE_JPY = usdToJpy(REAL_SURCHARGE_USD);

export type RealPricingTripType = "PICKUP" | "DROPOFF" | "POINT_TO_POINT";

export type RealVehicle = {
  id: string;
  name: string;
  seats: number;
  luggageSmall: number;
  luggageMedium: number;
  luggageLarge: number;
  isLuxury?: boolean;
  isBus?: boolean;
  description: string;
};

type SourceVehiclePriceKey = "seat5" | "seat7" | "seat10" | "seat14" | "seat18";

type SourceRoutePrice = {
  fromArea: string;
  toAreas: string[];
  usd: Record<SourceVehiclePriceKey, number>;
};

export type GeneratedRealPricingRule = {
  fromArea: string;
  toArea: string;
  tripType: RealPricingTripType;
  vehicleTypeId: string;
  sourceVehicle: SourceVehiclePriceKey;
  sourceUsd: number;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
};

export const REAL_VEHICLES: RealVehicle[] = [
  {
    id: "economy_5",
    name: "5座车（经济型）",
    seats: 4,
    luggageSmall: 2,
    luggageMedium: 1,
    luggageLarge: 1,
    description: "适合 1-3 人轻装出行",
  },
  {
    id: "business_7",
    name: "7座车（商务型）",
    seats: 6,
    luggageSmall: 2,
    luggageMedium: 3,
    luggageLarge: 2,
    description: "适合家庭/多人出行",
  },
  {
    id: "large_9",
    name: "9座车（大空间）",
    seats: 9,
    luggageSmall: 6,
    luggageMedium: 9,
    luggageLarge: 3,
    description: "适合行李较多",
  },
  {
    id: "luxury_vip",
    name: "豪华型（VIP）",
    seats: 4,
    luggageSmall: 3,
    luggageMedium: 2,
    luggageLarge: 2,
    isLuxury: true,
    description: "更舒适的商务接待",
  },
  {
    id: "bus_group",
    name: "大巴车（团体）",
    seats: 20,
    luggageSmall: 20,
    luggageMedium: 20,
    luggageLarge: 20,
    isBus: true,
    description: "团队出行与大型行李",
  },
];

export const REAL_VEHICLE_PRICE_MAPPING = [
  { vehicleTypeId: "economy_5", sourceVehicle: "seat5", usdDelta: 0 },
  { vehicleTypeId: "business_7", sourceVehicle: "seat7", usdDelta: 0 },
  { vehicleTypeId: "large_9", sourceVehicle: "seat10", usdDelta: 0 },
  { vehicleTypeId: "luxury_vip", sourceVehicle: "seat7", usdDelta: 5 },
  { vehicleTypeId: "bus_group", sourceVehicle: "seat18", usdDelta: 0 },
] as const satisfies Array<{
  vehicleTypeId: string;
  sourceVehicle: SourceVehiclePriceKey;
  usdDelta: number;
}>;

export const REAL_SOURCE_ROUTE_PRICES: SourceRoutePrice[] = [
  {
    fromArea: "NRT",
    toAreas: TOKYO_WARD_PRICING_CODES,
    usd: { seat5: 88, seat7: 90, seat10: 110, seat14: 220, seat18: 400 },
  },
  {
    fromArea: "HND",
    toAreas: TOKYO_WARD_PRICING_CODES,
    usd: { seat5: 45, seat7: 46, seat10: 70, seat14: 130, seat18: 250 },
  },
  {
    fromArea: "NRT",
    toAreas: ["YOKOHAMA"],
    usd: { seat5: 117, seat7: 120, seat10: 150, seat14: 190, seat18: 450 },
  },
  {
    fromArea: "HND",
    toAreas: ["YOKOHAMA"],
    usd: { seat5: 65, seat7: 68, seat10: 110, seat14: 250, seat18: 400 },
  },
  {
    fromArea: "KIX",
    toAreas: ["OSAKA_CITY"],
    usd: { seat5: 70, seat7: 75, seat10: 95, seat14: 120, seat18: 250 },
  },
  {
    fromArea: "ITM",
    toAreas: ["OSAKA_CITY"],
    usd: { seat5: 55, seat7: 60, seat10: 80, seat14: 100, seat18: 200 },
  },
  {
    fromArea: "KIX",
    toAreas: ["KYOTO_CITY"],
    usd: { seat5: 135, seat7: 140, seat10: 160, seat14: 180, seat18: 400 },
  },
  {
    fromArea: "ITM",
    toAreas: ["KYOTO_CITY"],
    usd: { seat5: 100, seat7: 110, seat10: 130, seat14: 160, seat18: 300 },
  },
];

export function usdToJpy(usd: number) {
  return Math.round(usd / REAL_PRICING_USD_PER_JPY);
}

function buildRule({
  fromArea,
  toArea,
  tripType,
  vehicleTypeId,
  sourceVehicle,
  sourceUsd,
}: Omit<GeneratedRealPricingRule, "basePriceJpy" | "nightFeeJpy" | "urgentFeeJpy">): GeneratedRealPricingRule {
  return {
    fromArea,
    toArea,
    tripType,
    vehicleTypeId,
    sourceVehicle,
    sourceUsd,
    basePriceJpy: usdToJpy(sourceUsd),
    nightFeeJpy: REAL_SURCHARGE_JPY,
    urgentFeeJpy: REAL_SURCHARGE_JPY,
  };
}

export function generateRealPricingRules() {
  const rules: GeneratedRealPricingRule[] = [];

  for (const route of REAL_SOURCE_ROUTE_PRICES) {
    for (const toArea of route.toAreas) {
      for (const mapping of REAL_VEHICLE_PRICE_MAPPING) {
        const sourceUsd = route.usd[mapping.sourceVehicle] + mapping.usdDelta;

        rules.push(
          buildRule({
            fromArea: route.fromArea,
            toArea,
            tripType: "PICKUP",
            vehicleTypeId: mapping.vehicleTypeId,
            sourceVehicle: mapping.sourceVehicle,
            sourceUsd,
          })
        );
        rules.push(
          buildRule({
            fromArea: toArea,
            toArea: route.fromArea,
            tripType: "DROPOFF",
            vehicleTypeId: mapping.vehicleTypeId,
            sourceVehicle: mapping.sourceVehicle,
            sourceUsd,
          })
        );
      }
    }
  }

  return rules;
}
