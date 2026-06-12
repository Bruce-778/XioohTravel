import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminUpdateBookingSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";
import { expireCheckoutSessionSafely } from "@/lib/stripe";

// Allowed manual status transitions. Payments must come from Stripe (never set
// PAID by hand) and paid bookings can only be CANCELLED once a refund exists,
// so DB state cannot silently diverge from money movements.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["CONFIRMED", "IN_SERVICE", "COMPLETED", "CANCELLED"],
  CONFIRMED: ["PAID", "IN_SERVICE", "COMPLETED", "CANCELLED"],
  IN_SERVICE: ["CONFIRMED", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: auth.status });

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

    if (nextStatus !== booking.status) {
      const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json({ error: t("api.invalidStatusTransition") }, { status: 400 });
      }

      const isPaidBooking = booking.stripe_payment_status === "paid" || ["PAID", "CONFIRMED", "IN_SERVICE"].includes(booking.status);
      if (nextStatus === "CANCELLED" && isPaidBooking && !booking.stripe_refund_id) {
        // Refund first (customer cancel flow or Stripe dashboard), then cancel.
        return NextResponse.json({ error: t("api.invalidStatusTransition") }, { status: 400 });
      }
    }

    if (
      (booking.status !== "PENDING_PAYMENT" || nextStatus !== "PENDING_PAYMENT") &&
      manualAdjustmentJpy !== undefined &&
      nextManual !== currentManual
    ) {
      return NextResponse.json({ error: t("api.paidBookingLocked") }, { status: 400 });
    }

    // Adjusting the price or cancelling an unpaid booking invalidates the
    // outstanding payment link so the customer cannot pay a stale amount.
    const priceChanged = nextManual !== currentManual;
    const cancellingUnpaid = nextStatus === "CANCELLED" && booking.status === "PENDING_PAYMENT";
    if ((priceChanged || cancellingUnpaid) && booking.stripe_checkout_session_id) {
      const expireResult = await expireCheckoutSessionSafely(booking.stripe_checkout_session_id).catch(
        () => "not_expirable" as const
      );
      if (expireResult === "already_completed") {
        return NextResponse.json({ error: t("api.cancelStateChanged") }, { status: 409 });
      }
    }

    const nextTotal = base + night + urgent + childSeat + meetAndGreet + nextManual;

    await db.query(
      `UPDATE bookings SET status = $1, pricing_manual_adjustment_jpy = $2, pricing_total_jpy = $3, pricing_note = $4,
         cancelled_at = CASE WHEN $1 = 'CANCELLED' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END,
         updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, nextManual, nextTotal, pricingNote ?? booking.pricing_note, bookingId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
