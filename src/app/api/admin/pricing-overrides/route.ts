import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { requireAdmin } from "@/lib/adminAuth";
import {
  normalizePricingRouteValue,
  toContainsPattern,
} from "@/lib/adminPricing";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { AdminPricingOverrideSchema, AdminPricingOverrideUpdateSchema } from "@/lib/validators";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const PRICING_OVERRIDES_MIGRATION_COMMAND = "npm run patch:pricing-overrides";

type Translate = (key: string) => string;

function getDatabaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function isMissingOverrideTableError(error: unknown) {
  return getDatabaseErrorCode(error) === "42P01";
}

function getMissingOverrideTablePayload(t: Translate) {
  return {
    error: t("api.pricingOverridesMigrationRequired"),
    message: t("api.pricingOverridesMigrationRequired"),
    migrationRequired: true,
    migrationCommand: PRICING_OVERRIDES_MIGRATION_COMMAND,
  };
}

function missingOverrideTableMutationResponse(t: Translate) {
  return NextResponse.json(getMissingOverrideTablePayload(t), {
    status: 503,
    headers: NO_STORE_HEADERS,
  });
}

type PricingOverrideRow = {
  id: string;
  created_at: Date | string;
  updated_at: Date | string;
  from_area: string;
  to_area: string;
  trip_type: string;
  vehicle_type_id: string;
  starts_at: Date | string;
  ends_at: Date | string;
  base_price_jpy: number;
  night_fee_jpy: number;
  urgent_fee_jpy: number;
  note: string | null;
  enabled: boolean;
  vehicleName: string;
  vehicleSeats: number;
};

function mapOverride(row: PricingOverrideRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fromArea: row.from_area,
    toArea: row.to_area,
    tripType: row.trip_type,
    vehicleTypeId: row.vehicle_type_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    basePriceJpy: row.base_price_jpy,
    nightFeeJpy: row.night_fee_jpy,
    urgentFeeJpy: row.urgent_fee_jpy,
    note: row.note,
    enabled: row.enabled,
    vehicleType: {
      id: row.vehicle_type_id,
      name: row.vehicleName,
      seats: row.vehicleSeats,
    },
  };
}

async function getOverrideById(id: string) {
  const { rows } = await db.query(
    `SELECT o.*, v.name as "vehicleName", v.seats as "vehicleSeats"
     FROM pricing_rule_overrides o
     JOIN vehicle_types v ON o.vehicle_type_id = v.id
     WHERE o.id = $1
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapOverride(rows[0] as PricingOverrideRow);
}

function parseDateOrNull(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const vehicleTypeId = searchParams.get("vehicleTypeId")?.trim() ?? "";
    const fromArea = searchParams.get("fromArea")?.trim() ?? "";
    const toArea = searchParams.get("toArea")?.trim() ?? "";
    const tripType = searchParams.get("tripType")?.trim() ?? "";
    const enabled = searchParams.get("enabled")?.trim() ?? "";

    let query = `
      SELECT o.*, v.name as "vehicleName", v.seats as "vehicleSeats"
      FROM pricing_rule_overrides o
      JOIN vehicle_types v ON o.vehicle_type_id = v.id
      WHERE 1=1
    `;
    const params: Array<string | boolean> = [];

    const addParam = (value: string | boolean) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (q) {
      const qPatternRef = addParam(toContainsPattern(q));
      const normalizedQ = normalizePricingRouteValue(q);
      let qClause = `(o.from_area ILIKE ${qPatternRef} ESCAPE '\\' OR o.to_area ILIKE ${qPatternRef} ESCAPE '\\'`;
      if (normalizedQ) {
        const normalizedQRef = addParam(normalizedQ);
        qClause += ` OR LOWER(o.from_area) = LOWER(${normalizedQRef}) OR LOWER(o.to_area) = LOWER(${normalizedQRef})`;
      }
      qClause += ")";
      query += ` AND ${qClause}`;
    }

    if (fromArea) {
      const fromPatternRef = addParam(toContainsPattern(fromArea));
      const normalizedFrom = normalizePricingRouteValue(fromArea);
      let fromClause = `(o.from_area ILIKE ${fromPatternRef} ESCAPE '\\'`;
      if (normalizedFrom) {
        const normalizedFromRef = addParam(normalizedFrom);
        fromClause += ` OR LOWER(o.from_area) = LOWER(${normalizedFromRef})`;
      }
      fromClause += ")";
      query += ` AND ${fromClause}`;
    }

    if (toArea) {
      const toPatternRef = addParam(toContainsPattern(toArea));
      const normalizedTo = normalizePricingRouteValue(toArea);
      let toClause = `(o.to_area ILIKE ${toPatternRef} ESCAPE '\\'`;
      if (normalizedTo) {
        const normalizedToRef = addParam(normalizedTo);
        toClause += ` OR LOWER(o.to_area) = LOWER(${normalizedToRef})`;
      }
      toClause += ")";
      query += ` AND ${toClause}`;
    }

    if (tripType) {
      query += ` AND o.trip_type = ${addParam(tripType)}`;
    }

    if (vehicleTypeId) {
      query += ` AND o.vehicle_type_id = ${addParam(vehicleTypeId)}`;
    }

    if (enabled === "true" || enabled === "false") {
      query += ` AND o.enabled = ${addParam(enabled === "true")}`;
    }

    query += ` ORDER BY o.starts_at DESC, o.from_area ASC, o.to_area ASC, o.trip_type ASC, v.seats ASC, v.name ASC`;

    const { rows } = await db.query(query, params);
    return NextResponse.json({ overrides: (rows as PricingOverrideRow[]).map(mapOverride) }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    if (isMissingOverrideTableError(error)) {
      return NextResponse.json(
        {
          ...getMissingOverrideTablePayload(t),
          overrides: [],
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: auth.status });

  let client: PoolClient | null = null;
  let transactionStarted = false;
  try {
    const json = await req.json();
    const parsed = AdminPricingOverrideSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedFromArea = normalizePricingRouteValue(parsed.data.fromArea);
    const normalizedToArea = normalizePricingRouteValue(parsed.data.toArea);
    const startsAt = parseDateOrNull(parsed.data.startsAt);
    const endsAt = parseDateOrNull(parsed.data.endsAt);

    if (!normalizedFromArea || !normalizedToArea || !startsAt || !endsAt) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const {
      tripType,
      vehicleTypeId,
      basePriceJpy,
      nightFeeJpy,
      urgentFeeJpy,
      note,
    } = parsed.data;
    const enabled = parsed.data.enabled ?? true;

    client = await db.pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const { rows: vehicleTypes } = await client.query("SELECT id FROM vehicle_types WHERE id = $1", [vehicleTypeId]);
    if (vehicleTypes.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
    }

    if (enabled) {
      const { rows: conflictRows } = await client.query(
        `SELECT id
         FROM pricing_rule_overrides
         WHERE enabled = TRUE
           AND from_area = $1
           AND to_area = $2
           AND trip_type = $3
           AND vehicle_type_id = $4
           AND starts_at < $6
           AND ends_at > $5
         LIMIT 1`,
        [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, startsAt, endsAt]
      );

      if (conflictRows.length > 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json({ error: t("api.pricingOverrideConflict") }, { status: 409 });
      }
    }

    const id = randomUUID();
    await client.query(
      `INSERT INTO pricing_rule_overrides (
        id, from_area, to_area, trip_type, vehicle_type_id, starts_at, ends_at,
        base_price_jpy, night_fee_jpy, urgent_fee_jpy, note, enabled
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12
      )`,
      [
        id,
        normalizedFromArea,
        normalizedToArea,
        tripType,
        vehicleTypeId,
        startsAt,
        endsAt,
        basePriceJpy,
        nightFeeJpy ?? 0,
        urgentFeeJpy ?? 0,
        note?.trim() || null,
        enabled,
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const override = await getOverrideById(id);
    return NextResponse.json({ ok: true, override }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    if (transactionStarted) {
      await client?.query("ROLLBACK").catch(() => undefined);
    }

    if (isMissingOverrideTableError(error)) {
      return missingOverrideTableMutationResponse(t);
    }

    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500, headers: NO_STORE_HEADERS });
  } finally {
    client?.release();
  }
}

export async function PUT(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: auth.status });

  let client: PoolClient | null = null;
  let transactionStarted = false;
  try {
    const json = await req.json();
    const parsed = AdminPricingOverrideUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedFromArea = normalizePricingRouteValue(parsed.data.fromArea);
    const normalizedToArea = normalizePricingRouteValue(parsed.data.toArea);
    const startsAt = parseDateOrNull(parsed.data.startsAt);
    const endsAt = parseDateOrNull(parsed.data.endsAt);

    if (!normalizedFromArea || !normalizedToArea || !startsAt || !endsAt) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const {
      id,
      tripType,
      vehicleTypeId,
      basePriceJpy,
      nightFeeJpy,
      urgentFeeJpy,
      note,
    } = parsed.data;
    const enabled = parsed.data.enabled ?? true;

    client = await db.pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const { rows: existingRows } = await client.query(
      "SELECT id FROM pricing_rule_overrides WHERE id = $1 LIMIT 1",
      [id]
    );
    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: t("api.pricingOverrideNotFound") }, { status: 404 });
    }

    const { rows: vehicleTypes } = await client.query("SELECT id FROM vehicle_types WHERE id = $1", [vehicleTypeId]);
    if (vehicleTypes.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json({ error: t("api.vehicleTypeNotFound") }, { status: 404 });
    }

    if (enabled) {
      const { rows: conflictRows } = await client.query(
        `SELECT id
         FROM pricing_rule_overrides
         WHERE enabled = TRUE
           AND id != $5
           AND from_area = $1
           AND to_area = $2
           AND trip_type = $3
           AND vehicle_type_id = $4
           AND starts_at < $7
           AND ends_at > $6
         LIMIT 1`,
        [normalizedFromArea, normalizedToArea, tripType, vehicleTypeId, id, startsAt, endsAt]
      );

      if (conflictRows.length > 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return NextResponse.json({ error: t("api.pricingOverrideConflict") }, { status: 409 });
      }
    }

    await client.query(
      `UPDATE pricing_rule_overrides
       SET from_area = $1,
           to_area = $2,
           trip_type = $3,
           vehicle_type_id = $4,
           starts_at = $5,
           ends_at = $6,
           base_price_jpy = $7,
           night_fee_jpy = $8,
           urgent_fee_jpy = $9,
           note = $10,
           enabled = $11,
           updated_at = NOW()
       WHERE id = $12`,
      [
        normalizedFromArea,
        normalizedToArea,
        tripType,
        vehicleTypeId,
        startsAt,
        endsAt,
        basePriceJpy,
        nightFeeJpy ?? 0,
        urgentFeeJpy ?? 0,
        note?.trim() || null,
        enabled,
        id,
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const override = await getOverrideById(id);
    return NextResponse.json({ ok: true, override }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    if (transactionStarted) {
      await client?.query("ROLLBACK").catch(() => undefined);
    }

    if (isMissingOverrideTableError(error)) {
      return missingOverrideTableMutationResponse(t);
    }

    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500, headers: NO_STORE_HEADERS });
  } finally {
    client?.release();
  }
}

export async function DELETE(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const { rowCount } = await db.query("DELETE FROM pricing_rule_overrides WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: t("api.pricingOverrideNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    if (isMissingOverrideTableError(error)) {
      return missingOverrideTableMutationResponse(t);
    }

    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
