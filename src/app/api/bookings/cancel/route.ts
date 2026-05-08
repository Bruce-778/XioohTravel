import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CancelBookingSchema } from "@/lib/validators";
import { canUserCancel } from "@/lib/bookingRules";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const json = await req.json();
    const parsed = CancelBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }
    const { bookingId, contactEmail, reason } = parsed.data;

    const { rows: bookings } = await db.query("SELECT * FROM bookings WHERE id = $1", [bookingId]);
    if (bookings.length === 0) return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    const booking = bookings[0];

    if (booking.contact_email !== contactEmail) {
      return NextResponse.json({ error: t("api.emailMismatch") }, { status: 403 });
    }
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ ok: true });
    }
    if (booking.status === "COMPLETED") {
      return NextResponse.json({ error: t("api.cancelPast") }, { status: 400 });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      const now = new Date();
      const decision = canUserCancel(now, new Date(booking.pickup_time), booking.is_urgent);
      if (!decision.ok) {
        return NextResponse.json({ error: t(decision.reason) }, { status: 400 });
      }
    }

    await db.query(
      `UPDATE bookings SET status = 'CANCELLED', cancel_reason = $1, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [reason, bookingId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
