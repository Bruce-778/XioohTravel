import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function GET() {
  const { t } = await getT();
  const session = await getSession();

  // Orders contain PII; viewing them always requires a verified login session.
  if (!session) {
    return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
  }

  let bookings: any[] = [];

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
       WHERE LOWER(b.contact_email) = ANY($1)
       ORDER BY b.created_at DESC`,
      [emails.map((email) => email.toLowerCase())]
    );
    bookings = rows;
  }

  const rows = bookings.map((b) => ({
    id: b.id,
    createdAt: new Date(b.created_at).toISOString(),
    tripType: b.trip_type,
    pickupTime: new Date(b.pickup_time).toISOString(),
    pickupLocation: b.pickup_location,
    dropoffLocation: b.dropoff_location,
    flightNumber: b.flight_number,
    flightNote: b.flight_note,
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
    pricingManualAdjustmentJpy: b.pricing_manual_adjustment_jpy,
    pricingNote: b.pricing_note,
    cancelReason: b.cancel_reason,
    cancelledAt: b.cancelled_at ? new Date(b.cancelled_at).toISOString() : null,
    stripePaymentFeeJpy: b.stripe_payment_fee_jpy ?? null,
    stripeRefundId: b.stripe_refund_id ?? null,
    stripeRefundStatus: b.stripe_refund_status ?? null,
    refundAmountJpy: b.refund_amount_jpy ?? null,
    refundFeeDeductedJpy: b.refund_fee_deducted_jpy ?? null,
    refundRequestedAt: b.refund_requested_at ? new Date(b.refund_requested_at).toISOString() : null,
    refundedAt: b.refunded_at ? new Date(b.refunded_at).toISOString() : null,
    refundFailureReason: b.refund_failure_reason ?? null,
    refundConfirmationEmailSentAt: b.refund_confirmation_email_sent_at
      ? new Date(b.refund_confirmation_email_sent_at).toISOString()
      : null,
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
