import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

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

  const rows = bookings.map((b) => ({
    id: b.id,
    createdAt: new Date(b.created_at).toISOString(),
    tripType: b.trip_type,
    pickupTime: new Date(b.pickup_time).toISOString(),
    pickupLocation: b.pickup_location,
    dropoffLocation: b.dropoff_location,
    fromTo: `${b.pickup_location} → ${b.dropoff_location}`,
    flightNumber: b.flight_number,
    flightNote: b.flight_note,
    vehicleName: b.vehicle_name,
    vehicleTypeId: b.vehicle_type_id,
    passengers: b.passengers,
    childSeats: b.child_seats,
    meetAndGreetSign: b.meet_and_greet_sign,
    luggageSmall: b.luggage_small,
    luggageMedium: b.luggage_medium,
    luggageLarge: b.luggage_large,
    contactName: b.contact_name,
    contactPhone: b.contact_phone,
    contactEmail: b.contact_email,
    contactNote: b.contact_note,
    status: b.status,
    isUrgent: b.is_urgent,
    pricingBaseJpy: b.pricing_base_jpy,
    pricingNightJpy: b.pricing_night_jpy,
    pricingUrgentJpy: b.pricing_urgent_jpy,
    pricingChildSeatJpy: b.pricing_child_seat_jpy,
    pricingMeetAndGreetJpy: b.pricing_meet_and_greet_jpy,
    totalJpy: b.pricing_total_jpy,
    pricingManualAdjustmentJpy: b.pricing_manual_adjustment_jpy,
    pricingNote: b.pricing_note ?? null,
    cancelReason: b.cancel_reason ?? null,
    cancelledAt: b.cancelled_at ? new Date(b.cancelled_at).toISOString() : null,
  }));

  return NextResponse.json({ rows });
}
