import { db } from "@/lib/db";
import { getPricingAreaCodeFromCandidates } from "@/lib/locationData";
import { parseJstDateTime } from "@/lib/timeFormat";

export type EffectivePricingRule = {
  source: "override" | "base";
  pricingRuleId: string | null;
  pricingOverrideId: string | null;
  fromArea: string;
  toArea: string;
  tripType: string;
  vehicleTypeId: string;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
  overrideNote: string | null;
};

type PricingBaseRow = {
  id: string;
  from_area: string;
  to_area: string;
  trip_type: string;
  vehicle_type_id: string;
  base_price_jpy: number;
  night_fee_jpy: number;
  urgent_fee_jpy: number;
};

type PricingOverrideRow = PricingBaseRow & {
  note: string | null;
};

type EffectivePricingInput = {
  fromArea: string;
  toArea: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  tripType: string;
  vehicleTypeId: string;
  pickupTime: Date | string;
};

type EffectivePricingRouteInput = Omit<EffectivePricingInput, "vehicleTypeId">;

function normalizeArea(...values: Array<string | null | undefined>) {
  return getPricingAreaCodeFromCandidates(...values).trim();
}

function toPricingInstant(value: Date | string) {
  return parseJstDateTime(value);
}

function isMissingOverrideTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function mapBaseRule(row: PricingBaseRow): EffectivePricingRule {
  return {
    source: "base",
    pricingRuleId: row.id,
    pricingOverrideId: null,
    fromArea: row.from_area,
    toArea: row.to_area,
    tripType: row.trip_type,
    vehicleTypeId: row.vehicle_type_id,
    basePriceJpy: Number(row.base_price_jpy ?? 0),
    nightFeeJpy: Number(row.night_fee_jpy ?? 0),
    urgentFeeJpy: Number(row.urgent_fee_jpy ?? 0),
    overrideNote: null,
  };
}

function mapOverrideRule(row: PricingOverrideRow): EffectivePricingRule {
  return {
    source: "override",
    pricingRuleId: null,
    pricingOverrideId: row.id,
    fromArea: row.from_area,
    toArea: row.to_area,
    tripType: row.trip_type,
    vehicleTypeId: row.vehicle_type_id,
    basePriceJpy: Number(row.base_price_jpy ?? 0),
    nightFeeJpy: Number(row.night_fee_jpy ?? 0),
    urgentFeeJpy: Number(row.urgent_fee_jpy ?? 0),
    overrideNote: row.note ?? null,
  };
}

export async function getEffectivePricingRule({
  fromArea,
  toArea,
  fromAddress,
  toAddress,
  tripType,
  vehicleTypeId,
  pickupTime,
}: EffectivePricingInput): Promise<EffectivePricingRule | null> {
  const normalizedFromArea = normalizeArea(fromArea, fromAddress);
  const normalizedToArea = normalizeArea(toArea, toAddress);
  const pricingInstant = toPricingInstant(pickupTime);

  let overrideRows: PricingOverrideRow[] = [];
  try {
    const result = await db.query(
      `SELECT id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy, note
       FROM pricing_rule_overrides
       WHERE enabled = TRUE
         AND from_area = $1
         AND to_area = $2
         AND trip_type = $3
         AND vehicle_type_id = $4
         AND starts_at <= $5
         AND ends_at > $5
       ORDER BY starts_at DESC, created_at DESC
       LIMIT 1`,
      [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, pricingInstant]
    );
    overrideRows = result.rows as PricingOverrideRow[];
  } catch (error) {
    if (!isMissingOverrideTableError(error)) {
      throw error;
    }
  }

  if (overrideRows.length > 0) {
    return mapOverrideRule(overrideRows[0] as PricingOverrideRow);
  }

  const { rows: baseRows } = await db.query(
    `SELECT id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy
     FROM pricing_rules
     WHERE from_area = $1
       AND to_area = $2
       AND trip_type = $3
       AND vehicle_type_id = $4
     LIMIT 1`,
    [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId]
  );

  if (baseRows.length === 0) {
    return null;
  }

  return mapBaseRule(baseRows[0] as PricingBaseRow);
}

export async function getEffectivePricingRulesForRoute({
  fromArea,
  toArea,
  fromAddress,
  toAddress,
  tripType,
  pickupTime,
}: EffectivePricingRouteInput): Promise<EffectivePricingRule[]> {
  const normalizedFromArea = normalizeArea(fromArea, fromAddress);
  const normalizedToArea = normalizeArea(toArea, toAddress);
  const pricingInstant = toPricingInstant(pickupTime);

  const baseRulesPromise = db.query(
    `SELECT id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy
     FROM pricing_rules
     WHERE from_area = $1
       AND to_area = $2
       AND trip_type = $3`,
    [normalizedFromArea, normalizedToArea, tripType]
  );
  const overrideRulesPromise = db.query(
    `SELECT id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy, note
     FROM pricing_rule_overrides
     WHERE enabled = TRUE
       AND from_area = $1
       AND to_area = $2
       AND trip_type = $3
       AND starts_at <= $4
       AND ends_at > $4
     ORDER BY vehicle_type_id ASC, starts_at DESC, created_at DESC`,
    [normalizedFromArea, normalizedToArea, tripType, pricingInstant]
  ).catch((error) => {
    if (isMissingOverrideTableError(error)) {
      return { rows: [] };
    }
    throw error;
  });

  const [{ rows: baseRows }, { rows: overrideRows }] = await Promise.all([
    baseRulesPromise,
    overrideRulesPromise,
  ]);

  const ruleByVehicle = new Map<string, EffectivePricingRule>();

  for (const row of overrideRows as PricingOverrideRow[]) {
    if (!ruleByVehicle.has(row.vehicle_type_id)) {
      ruleByVehicle.set(row.vehicle_type_id, mapOverrideRule(row));
    }
  }

  for (const row of baseRows as PricingBaseRow[]) {
    if (!ruleByVehicle.has(row.vehicle_type_id)) {
      ruleByVehicle.set(row.vehicle_type_id, mapBaseRule(row));
    }
  }

  return Array.from(ruleByVehicle.values());
}
