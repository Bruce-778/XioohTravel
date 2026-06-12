import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { RetryPaymentSchema } from "@/lib/validators";
import { canCreateBooking } from "@/lib/bookingRules";
import {
  attachCheckoutSessionToBooking,
  getBookingById,
  getUserAccessibleEmails,
  syncBookingPaymentFromCheckoutSession,
} from "@/lib/bookings";
import {
  createBookingCheckoutSession,
  expireCheckoutSessionSafely,
  isStripeCheckoutUnavailableError,
  retrieveCheckoutSession,
} from "@/lib/stripe";

export async function POST(req: Request) {
  const { t } = await getT();

  try {
    const json = await req.json();
    const parsed = RetryPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
    }

    const booking = await getBookingById(parsed.data.bookingId);
    if (!booking) {
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }

    const accessibleEmails = (await getUserAccessibleEmails(session.userId, session.email)).map((email) =>
      email.trim().toLowerCase()
    );
    if (!accessibleEmails.includes(String(booking.contact_email ?? "").trim().toLowerCase())) {
      return NextResponse.json({ error: t("api.unauthorized") }, { status: 403 });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: t("api.bookingNotPendingPayment") }, { status: 400 });
    }

    // The lead-time rule applies to retries too; otherwise customers could pay
    // for pickups that are about to happen (or already happened).
    if (!canCreateBooking(new Date(), new Date(booking.pickup_time))) {
      return NextResponse.json({ error: t("api.bookingLeadTime") }, { status: 400 });
    }

    // Expire any previous Checkout Session so at most one payable link exists
    // per booking; otherwise the customer could pay twice via stale tabs.
    if (booking.stripe_checkout_session_id) {
      const expireResult = await expireCheckoutSessionSafely(booking.stripe_checkout_session_id).catch(
        () => "not_expirable" as const
      );
      if (expireResult === "already_completed") {
        try {
          const completedSession = await retrieveCheckoutSession(booking.stripe_checkout_session_id);
          await syncBookingPaymentFromCheckoutSession(completedSession);
        } catch (syncError) {
          console.error("[retry_payment] Failed to sync completed session", {
            bookingId: booking.id,
            sessionId: booking.stripe_checkout_session_id,
            error: syncError,
          });
        }
        return NextResponse.json({ error: t("api.bookingNotPendingPayment") }, { status: 409 });
      }
    }

    const checkoutSession = await createBookingCheckoutSession(
      {
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
      },
      {
        // Coalesce rapid double-clicks into a single Stripe session.
        idempotencyKey: `booking-checkout-retry-${booking.id}-${Math.floor(Date.now() / 60_000)}`,
      }
    );

    await attachCheckoutSessionToBooking(booking.id, checkoutSession);

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (e: any) {
    if (e?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }
    if (isStripeCheckoutUnavailableError(e)) {
      console.error("Stripe checkout unavailable:", e);
      return NextResponse.json({ error: t("api.paymentServiceUnavailable") }, { status: 504 });
    }
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
