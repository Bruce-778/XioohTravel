import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getT } from "@/lib/i18n";

export async function GET(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { rows: vehicles } = await db.query(
      "SELECT * FROM vehicle_types ORDER BY is_bus ASC, is_luxury ASC, seats ASC"
    );

    return NextResponse.json(
      {
        vehicles: vehicles.map(v => ({
          id: v.id,
          name: v.name,
          seats: v.seats,
          luggageSmall: v.luggage_small,
          luggageMedium: v.luggage_medium,
          luggageLarge: v.luggage_large,
          isLuxury: v.is_luxury,
          isBus: v.is_bus,
          description: v.description
        }))
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
