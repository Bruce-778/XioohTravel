import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { RetryPaymentSchema } from "@/lib/validators";
import {
  attachCheckoutSessionToBooking,
  getBookingById,
  getUserAccessibleEmails,
} from "@/lib/bookings";
import { createBookingCheckoutSession } from "@/lib/stripe";

export async function POST(req: Request) {
  const { t } = await getT();

  try {
    const json = await req.json();
    const parsed = RetryPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const booking = await getBookingById(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: t("api.bookingNotPendingPayment") }, { status: 400 });
    }

    const session = await getSession();
    if (session) {
      const accessibleEmails = await getUserAccessibleEmails(session.userId, session.email);
      if (!accessibleEmails.includes(booking.contact_email)) {
        return NextResponse.json({ error: t("api.unauthorized") }, { status: 403 });
      }
    } else if (parsed.data.contactEmail !== booking.contact_email) {
      return NextResponse.json({ error: t("api.emailMismatch") }, { status: 403 });
    }

    const checkoutSession = await createBookingCheckoutSession({
      bookingId: booking.id,
      contactEmail: booking.contact_email,
      baseJpy: Number(booking.pricing_base_jpy ?? 0),
      nightJpy: Number(booking.pricing_night_jpy ?? 0),
      urgentJpy: Number(booking.pricing_urgent_jpy ?? 0),
      childSeats: Number(booking.child_seats ?? 0),
      childSeatTotalJpy: Number(booking.pricing_child_seat_jpy ?? 0),
      meetAndGreetSign: Boolean(booking.meet_and_greet_sign),
      meetAndGreetTotalJpy: Number(booking.pricing_meet_and_greet_jpy ?? 0),
      manualAdjustmentJpy: Number(booking.pricing_manual_adjustment_jpy ?? 0),
      totalJpy: Number(booking.pricing_total_jpy),
      pickupLocation: booking.pickup_location,
      dropoffLocation: booking.dropoff_location,
      pickupTime: new Date(booking.pickup_time),
      req,
    });

    await attachCheckoutSessionToBooking(booking.id, checkoutSession);

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (e: any) {
    if (e?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
