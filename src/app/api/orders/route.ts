import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function GET(req: Request) {
  const { t } = await getT();
  const session = await getSession();
  
  let bookings: any[] = [];
  
  if (session) {
    // Fetch all emails for this user
    const { rows: emailRows } = await db.query(
      "SELECT email FROM user_emails WHERE user_id = $1",
      [session.userId]
    );
    const emails = Array.from(new Set([session.email, ...emailRows.map(r => r.email)]));
    
    if (emails.length > 0) {
      const { rows } = await db.query(
        `SELECT b.*, v.name as vehicle_name 
         FROM bookings b 
         LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
         WHERE b.contact_email = ANY($1)
         ORDER BY b.created_at DESC`,
        [emails]
      );
      bookings = rows;
    }
  } else {
    // Legacy support: fetch by single email if not logged in
    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim();
    if (!email) return NextResponse.json({ error: t("orders.email") }, { status: 400 });

    const { rows } = await db.query(
      `SELECT b.*, v.name as vehicle_name 
       FROM bookings b 
       LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
       WHERE b.contact_email = $1
       ORDER BY b.created_at DESC`,
      [email]
    );
    bookings = rows;
  }

  const rows = bookings.map((b) => ({
    id: b.id,
    createdAt: new Date(b.created_at).toISOString(),
    pickupTime: new Date(b.pickup_time).toISOString(),
    pickupLocation: b.pickup_location,
    dropoffLocation: b.dropoff_location,
    contactEmail: b.contact_email,
    status: b.status,
    isUrgent: b.is_urgent,
    totalJpy: b.pricing_total_jpy,
    vehicleName: b.vehicle_name
  }));

  return NextResponse.json(
    { rows },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
