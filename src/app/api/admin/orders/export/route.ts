import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { formatDateTimeJST } from "@/lib/timeFormat";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateType = searchParams.get("dateType") || "createdAt";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const dateColumn = dateType === "pickupTime" ? "pickup_time" : "created_at";

  let query = `
    SELECT b.*, v.name as vehicle_name 
    FROM bookings b
    LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND b.${dateColumn} >= $${paramIndex++}`;
    params.push(new Date(startDate));
  }
  if (endDate) {
    query += ` AND b.${dateColumn} <= $${paramIndex++}`;
    params.push(new Date(endDate));
  }

  if (status && status !== "ALL") {
    query += ` AND b.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY b.is_urgent DESC, b.${dateColumn} DESC, b.created_at DESC`;

  const { rows: bookings } = await db.query(query, params);

  // Create CSV content
  const headers = [
    "Order ID",
    "Created At",
    "Pickup Time",
    "Status",
    "Vehicle",
    "Route",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "Passengers",
    "Child Seats",
    "Total (JPY)",
    "Manual Adjustment (JPY)",
    "Note"
  ];

  const rows = bookings.map((b: any) => [
    b.id,
    formatDateTimeJST(new Date(b.created_at).toISOString(), "zh-CN"),
    formatDateTimeJST(new Date(b.pickup_time).toISOString(), "zh-CN"),
    b.status,
    b.vehicle_name,
    `${b.pickup_location} -> ${b.dropoff_location}`,
    b.contact_name,
    b.contact_email,
    `'${b.contact_phone}`, // Use ' to prevent Excel from formatting as number
    b.passengers,
    b.child_seats,
    b.pricing_total_jpy,
    b.pricing_manual_adjustment_jpy,
    b.pricing_note || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  // Return CSV as download
  const response = new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().split("T")[0]}.csv"`
    }
  });

  return response;
}
