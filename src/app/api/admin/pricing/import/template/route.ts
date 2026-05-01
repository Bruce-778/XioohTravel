import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { VEHICLE_NAMES } from "@/lib/locationData";

export async function GET() {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const { rows: vehicleRows } = await db.query(
      "SELECT name FROM vehicle_types ORDER BY is_bus ASC, is_luxury ASC, seats ASC LIMIT 1"
    );
    const sampleVehicle = vehicleRows[0]?.name ?? VEHICLE_NAMES.ECONOMY_5;
    const csv = [
      "fromArea,toArea,tripType,vehicleType,basePriceJpy,nightFeeJpy,urgentFeeJpy",
      `NRT,Shinjuku,PICKUP,"${sampleVehicle}",18000,2000,3000`,
      `Narita airport,Ginza,DROPOFF,"${sampleVehicle}",19000,2000,3000`,
    ].join("\n");

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="pricing-rules-template.csv"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message ?? t("api.serverError") }, { status: 500 });
  }
}
