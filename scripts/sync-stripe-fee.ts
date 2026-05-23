import "dotenv/config";
import { db } from "@/lib/db";
import { getStripePaymentFeeLookupResult, retrieveCheckoutSessionWithPaymentIntent } from "@/lib/stripe";

type BookingPaymentFeeRow = {
  id: string;
  status: string;
  pricing_total_jpy: number | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_fee_jpy: number | null;
  stripe_balance_transaction_id: string | null;
};

function getBookingIdFromArgs() {
  const bookingId = process.argv[2]?.trim();
  if (!bookingId) {
    throw new Error("Usage: npm run sync:stripe-fee -- <BOOKING_ID>");
  }
  return bookingId;
}

function getPaymentIntentIdFromCheckoutSession(
  session: Awaited<ReturnType<typeof retrieveCheckoutSessionWithPaymentIntent>>
) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

async function ensurePaymentIntentId(booking: BookingPaymentFeeRow) {
  if (booking.stripe_payment_intent_id) {
    return booking.stripe_payment_intent_id;
  }

  if (!booking.stripe_checkout_session_id) {
    return null;
  }

  const checkoutSession = await retrieveCheckoutSessionWithPaymentIntent(booking.stripe_checkout_session_id);
  const paymentIntentId = getPaymentIntentIdFromCheckoutSession(checkoutSession);

  if (paymentIntentId) {
    await db.query(
      `UPDATE bookings
       SET stripe_payment_intent_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [booking.id, paymentIntentId]
    );
  }

  return paymentIntentId;
}

async function main() {
  const bookingId = getBookingIdFromArgs();
  const result = await db.query(
    `SELECT
       id,
       status,
       pricing_total_jpy,
       stripe_checkout_session_id,
       stripe_payment_intent_id,
       stripe_payment_fee_jpy,
       stripe_balance_transaction_id
     FROM bookings
     WHERE id = $1
     LIMIT 1`,
    [bookingId]
  );

  const booking = result.rows[0] as BookingPaymentFeeRow | undefined;
  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  if (booking.stripe_payment_fee_jpy != null && booking.stripe_balance_transaction_id) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          source: "cached",
          bookingId,
          status: booking.status,
          originalAmountJpy: booking.pricing_total_jpy,
          stripePaymentFeeJpy: booking.stripe_payment_fee_jpy,
          stripeBalanceTransactionId: booking.stripe_balance_transaction_id,
          refundAmountJpy:
            booking.pricing_total_jpy != null ? Number(booking.pricing_total_jpy) - booking.stripe_payment_fee_jpy : null,
        },
        null,
        2
      )
    );
    return;
  }

  const paymentIntentId = await ensurePaymentIntentId(booking);
  if (!paymentIntentId) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          bookingId,
          status: booking.status,
          reason: "payment_intent_missing",
          stripeCheckoutSessionId: booking.stripe_checkout_session_id,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const lookupResult = await getStripePaymentFeeLookupResult(paymentIntentId);
  if (!lookupResult.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          bookingId,
          status: booking.status,
          paymentIntentId,
          failure: lookupResult.failure,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const { breakdown } = lookupResult;
  await db.query(
    `UPDATE bookings
     SET stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
         stripe_payment_fee_jpy = $3,
         stripe_balance_transaction_id = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [bookingId, paymentIntentId, breakdown.feeJpy, breakdown.balanceTransactionId]
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "stripe",
        bookingId,
        status: booking.status,
        paymentIntentId,
        chargeId: breakdown.chargeId,
        livemode: breakdown.livemode,
        originalAmountJpy: booking.pricing_total_jpy,
        stripePaymentFeeJpy: breakdown.feeJpy,
        stripeBalanceTransactionId: breakdown.balanceTransactionId,
        stripeChargeCurrency: breakdown.chargeCurrency,
        stripeBalanceTransactionCurrency: breakdown.balanceTransactionCurrency,
        stripeBalanceTransactionFee: breakdown.balanceTransactionFee,
        stripeExchangeRate: breakdown.exchangeRate,
        refundAmountJpy:
          booking.pricing_total_jpy != null ? Number(booking.pricing_total_jpy) - breakdown.feeJpy : null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to sync Stripe payment fee:", error);
  process.exitCode = 1;
});
