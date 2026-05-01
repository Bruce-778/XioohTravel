import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import {
  normalizePricingRouteValue,
  toContainsPattern,
} from "@/lib/adminPricing";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { AdminPricingRuleSchema } from "@/lib/validators";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

async function getRuleById(id: string) {
  const { rows } = await db.query(
    `SELECT r.*, v.name as "vehicleName", v.seats as "vehicleSeats"
     FROM pricing_rules r
     JOIN vehicle_types v ON r.vehicle_type_id = v.id
     WHERE r.id = $1
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const rule = rows[0];
  return {
    id: rule.id,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
    fromArea: rule.from_area,
    toArea: rule.to_area,
    tripType: rule.trip_type,
    basePriceJpy: rule.base_price_jpy,
    nightFeeJpy: rule.night_fee_jpy,
    urgentFeeJpy: rule.urgent_fee_jpy,
    vehicleTypeId: rule.vehicle_type_id,
    vehicleType: {
      id: rule.vehicle_type_id,
      name: rule.vehicleName,
      seats: rule.vehicleSeats,
    },
  };
}

export async function GET(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const vehicleTypeId = searchParams.get("vehicleTypeId")?.trim() ?? "";
    const fromArea = searchParams.get("fromArea")?.trim() ?? "";
    const toArea = searchParams.get("toArea")?.trim() ?? "";
    const tripType = searchParams.get("tripType")?.trim() ?? "";

    let query = `
      SELECT r.*, v.name as "vehicleName", v.seats as "vehicleSeats"
      FROM pricing_rules r
      JOIN vehicle_types v ON r.vehicle_type_id = v.id
      WHERE 1=1
    `;
    const params: Array<string> = [];

    const addParam = (value: string) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (q) {
      const qPatternRef = addParam(toContainsPattern(q));
      const normalizedQ = normalizePricingRouteValue(q);
      let qClause = `(r.from_area ILIKE ${qPatternRef} ESCAPE '\\' OR r.to_area ILIKE ${qPatternRef} ESCAPE '\\'`;
      if (normalizedQ) {
        const normalizedQRef = addParam(normalizedQ);
        qClause += ` OR LOWER(r.from_area) = LOWER(${normalizedQRef}) OR LOWER(r.to_area) = LOWER(${normalizedQRef})`;
      }
      qClause += ")";
      query += ` AND ${qClause}`;
    }

    if (fromArea) {
      const fromPatternRef = addParam(toContainsPattern(fromArea));
      const normalizedFrom = normalizePricingRouteValue(fromArea);
      let fromClause = `(r.from_area ILIKE ${fromPatternRef} ESCAPE '\\'`;
      if (normalizedFrom) {
        const normalizedFromRef = addParam(normalizedFrom);
        fromClause += ` OR LOWER(r.from_area) = LOWER(${normalizedFromRef})`;
      }
      fromClause += ")";
      query += ` AND ${fromClause}`;
    }

    if (toArea) {
      const toPatternRef = addParam(toContainsPattern(toArea));
      const normalizedTo = normalizePricingRouteValue(toArea);
      let toClause = `(r.to_area ILIKE ${toPatternRef} ESCAPE '\\'`;
      if (normalizedTo) {
        const normalizedToRef = addParam(normalizedTo);
        toClause += ` OR LOWER(r.to_area) = LOWER(${normalizedToRef})`;
      }
      toClause += ")";
      query += ` AND ${toClause}`;
    }

    if (tripType) {
      query += ` AND r.trip_type = ${addParam(tripType)}`;
    }

    if (vehicleTypeId) {
      query += ` AND r.vehicle_type_id = ${addParam(vehicleTypeId)}`;
    }

    query += ` ORDER BY r.from_area ASC, r.to_area ASC, r.trip_type ASC, v.seats ASC, v.name ASC`;

    const { rows } = await db.query(query, params);

    const rules = rows.map((rule) => ({
      id: rule.id,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      fromArea: rule.from_area,
      toArea: rule.to_area,
      tripType: rule.trip_type,
      basePriceJpy: rule.base_price_jpy,
      nightFeeJpy: rule.night_fee_jpy,
      urgentFeeJpy: rule.urgent_fee_jpy,
      vehicleTypeId: rule.vehicle_type_id,
      vehicleType: {
        id: rule.vehicle_type_id,
        name: rule.vehicleName,
        seats: rule.vehicleSeats,
      },
    }));

    return NextResponse.json({ rules }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingRuleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedFromArea = normalizePricingRouteValue(parsed.data.fromArea);
    const normalizedToArea = normalizePricingRouteValue(parsed.data.toArea);
    if (!normalizedFromArea || !normalizedToArea) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const {
      tripType,
      vehicleTypeId,
      basePriceJpy,
      nightFeeJpy,
      urgentFeeJpy,
    } = parsed.data;

    const { rows: existing } = await db.query(
      `SELECT id
       FROM pricing_rules
       WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4`,
      [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
    }

    const { rows: vehicleTypes } = await db.query("SELECT id FROM vehicle_types WHERE id = $1", [vehicleTypeId]);
    if (vehicleTypes.length === 0) {
      return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
    }

    const id = generateId();
    await db.query(
      `INSERT INTO pricing_rules (id, from_area, to_area, trip_type, vehicle_type_id, base_price_jpy, night_fee_jpy, urgent_fee_jpy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy ?? 0, urgentFeeJpy ?? 0]
    );

    const rule = await getRuleById(id);
    return NextResponse.json({ ok: true, rule }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingRuleSchema.extend({
      id: z.string().min(1),
    }).safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedFromArea = normalizePricingRouteValue(parsed.data.fromArea);
    const normalizedToArea = normalizePricingRouteValue(parsed.data.toArea);
    if (!normalizedFromArea || !normalizedToArea) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const {
      id,
      tripType,
      vehicleTypeId,
      basePriceJpy,
      nightFeeJpy,
      urgentFeeJpy,
    } = parsed.data;

    const { rows: existingRows } = await db.query(
      "SELECT * FROM pricing_rules WHERE id = $1 LIMIT 1",
      [id]
    );
    if (existingRows.length === 0) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    const existingRule = existingRows[0];
    if (
      normalizedFromArea !== existingRule.from_area ||
      normalizedToArea !== existingRule.to_area ||
      tripType !== existingRule.trip_type ||
      vehicleTypeId !== existingRule.vehicle_type_id
    ) {
      const { rows: conflictRows } = await db.query(
        `SELECT id
         FROM pricing_rules
         WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4 AND id != $5`,
        [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, id]
      );

      if (conflictRows.length > 0) {
        return NextResponse.json({ error: t("api.pricingRuleExists") }, { status: 400 });
      }
    }

    await db.query(
      `UPDATE pricing_rules
       SET from_area = $1,
           to_area = $2,
           trip_type = $3,
           vehicle_type_id = $4,
           base_price_jpy = $5,
           night_fee_jpy = $6,
           urgent_fee_jpy = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, basePriceJpy, nightFeeJpy ?? 0, urgentFeeJpy ?? 0, id]
    );

    const updatedRule = await getRuleById(id);
    return NextResponse.json({ ok: true, rule: updatedRule }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const { rowCount } = await db.query("DELETE FROM pricing_rules WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: t("api.pricingRuleNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}
