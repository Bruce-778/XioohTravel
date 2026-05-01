import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { AdminPricingImportCommitSchema } from "@/lib/validators";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminPricingImportCommitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      let createCount = 0;
      let updateCount = 0;

      for (const row of parsed.data.rows) {
        const { rows: existingRows } = await client.query(
          `SELECT id
           FROM pricing_rules
           WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4
           LIMIT 1`,
          [row.fromArea, row.toArea, row.tripType, row.vehicleTypeId]
        );

        if (existingRows.length > 0) {
          await client.query(
            `UPDATE pricing_rules
             SET base_price_jpy = $1,
                 night_fee_jpy = $2,
                 urgent_fee_jpy = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [row.basePriceJpy, row.nightFeeJpy, row.urgentFeeJpy, existingRows[0].id]
          );
          updateCount += 1;
          continue;
        }

        await client.query(
          `INSERT INTO pricing_rules (
             id, from_area, to_area, trip_type, vehicle_type_id,
             base_price_jpy, night_fee_jpy, urgent_fee_jpy
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            generateId(),
            row.fromArea,
            row.toArea,
            row.tripType,
            row.vehicleTypeId,
            row.basePriceJpy,
            row.nightFeeJpy,
            row.urgentFeeJpy,
          ]
        );
        createCount += 1;
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          ok: true,
          summary: {
            totalRows: parsed.data.rows.length,
            createCount,
            updateCount,
          },
        },
        { headers: NO_STORE_HEADERS }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}
