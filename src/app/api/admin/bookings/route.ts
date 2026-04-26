import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminUpdateBookingSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminUpdateBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { bookingId, status, manualAdjustmentJpy, pricingNote } = parsed.data;
    const { rows: bookings } = await db.query("SELECT * FROM bookings WHERE id = $1", [bookingId]);
    if (bookings.length === 0) return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    const booking = bookings[0];

    const base = Number(booking.pricing_base_jpy ?? 0);
    const night = Number(booking.pricing_night_jpy ?? 0);
    const urgent = Number(booking.pricing_urgent_jpy ?? 0);
    const childSeat = Number(booking.pricing_child_seat_jpy ?? 0);
    const meetAndGreet = Number(booking.pricing_meet_and_greet_jpy ?? 0);
    const currentManual = Number(booking.pricing_manual_adjustment_jpy ?? 0);

    const nextManual = manualAdjustmentJpy ?? currentManual;
    const nextStatus = status ?? booking.status;

    if (
      (booking.status !== "PENDING_PAYMENT" || nextStatus !== "PENDING_PAYMENT") &&
      manualAdjustmentJpy !== undefined &&
      nextManual !== currentManual
    ) {
      return NextResponse.json({ error: t("api.paidBookingLocked") }, { status: 400 });
    }

    const nextTotal = base + night + urgent + childSeat + meetAndGreet + nextManual;

    await db.query(
      `UPDATE bookings SET status = $1, pricing_manual_adjustment_jpy = $2, pricing_total_jpy = $3, pricing_note = $4, updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, nextManual, nextTotal, pricingNote ?? booking.pricing_note, bookingId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
