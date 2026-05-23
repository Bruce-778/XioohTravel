import type { PoolClient } from "pg";
import { canUserCancel } from "@/lib/bookingRules";
import {
  getStripePaymentFeeLookupResult,
  retrieveCheckoutSessionWithPaymentIntent,
  type StripePaymentFeeLookupFailure,
} from "@/lib/stripe";

export type RefundAmountPreview = {
  paymentIntentId: string;
  originalAmountJpy: number;
  stripeFeeJpy: number;
  refundAmountJpy: number;
  stripeBalanceTransactionId: string;
  stripeChargeCurrency?: string;
  stripeBalanceTransactionCurrency?: string;
  stripeBalanceTransactionFee?: number;
  stripeExchangeRate?: number | null;
};

export class RefundFeeUnavailableError extends Error {
  constructor(
    message = "Stripe processing fee is not available yet",
    public readonly lookupFailure?: StripePaymentFeeLookupFailure
  ) {
    super(message);
    this.name = "RefundFeeUnavailableError";
  }
}

export class RefundPaymentMissingError extends Error {
  constructor(message = "Payment information is missing") {
    super(message);
    this.name = "RefundPaymentMissingError";
  }
}

export class RefundAmountInvalidError extends Error {
  constructor(message = "Refund amount is invalid") {
    super(message);
    this.name = "RefundAmountInvalidError";
  }
}

export function isPaidBooking(booking: {
  status: string;
  stripe_payment_status?: string | null;
}) {
  return booking.stripe_payment_status === "paid" || booking.status === "PAID" || booking.status === "CONFIRMED";
}

export function getPaidCancellationDecision(booking: {
  pickup_time: Date | string;
  is_urgent: boolean;
}) {
  return canUserCancel(new Date(), new Date(booking.pickup_time), booking.is_urgent);
}

function getPaymentIntentIdFromCheckoutSession(
  session: Awaited<ReturnType<typeof retrieveCheckoutSessionWithPaymentIntent>>
) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

async function ensurePaymentIntentId(
  client: PoolClient,
  booking: {
    id: string;
    stripe_payment_intent_id: string | null;
    stripe_checkout_session_id: string | null;
  }
) {
  let paymentIntentId = booking.stripe_payment_intent_id;

  if (!paymentIntentId && booking.stripe_checkout_session_id) {
    const checkoutSession = await retrieveCheckoutSessionWithPaymentIntent(booking.stripe_checkout_session_id);
    paymentIntentId = getPaymentIntentIdFromCheckoutSession(checkoutSession);

    if (paymentIntentId) {
      await client.query(
        `UPDATE bookings
         SET stripe_payment_intent_id = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id, paymentIntentId]
      );
    }
  }

  if (!paymentIntentId) {
    throw new RefundPaymentMissingError();
  }

  return paymentIntentId;
}

export async function calculateBookingRefundPreview(
  client: PoolClient,
  booking: {
    id: string;
    pricing_total_jpy: number | null;
    stripe_payment_intent_id: string | null;
    stripe_checkout_session_id: string | null;
    stripe_payment_fee_jpy?: number | null;
    stripe_balance_transaction_id?: string | null;
  }
): Promise<RefundAmountPreview> {
  const originalAmountJpy = Number(booking.pricing_total_jpy ?? 0);
  if (!Number.isFinite(originalAmountJpy) || originalAmountJpy <= 0) {
    throw new RefundAmountInvalidError();
  }

  const paymentIntentId = await ensurePaymentIntentId(client, booking);
  const cachedFeeJpy = Number(booking.stripe_payment_fee_jpy ?? 0);
  if (
    Number.isInteger(cachedFeeJpy) &&
    cachedFeeJpy > 0 &&
    typeof booking.stripe_balance_transaction_id === "string" &&
    booking.stripe_balance_transaction_id
  ) {
    const cachedRefundAmountJpy = originalAmountJpy - cachedFeeJpy;
    if (!Number.isInteger(cachedRefundAmountJpy) || cachedRefundAmountJpy <= 0) {
      throw new RefundAmountInvalidError();
    }

    return {
      paymentIntentId,
      originalAmountJpy,
      stripeFeeJpy: cachedFeeJpy,
      refundAmountJpy: cachedRefundAmountJpy,
      stripeBalanceTransactionId: booking.stripe_balance_transaction_id,
      stripeChargeCurrency: "jpy",
      stripeBalanceTransactionCurrency: "jpy",
      stripeBalanceTransactionFee: cachedFeeJpy,
      stripeExchangeRate: null,
    };
  }

  const feeLookupResult = await getStripePaymentFeeLookupResult(paymentIntentId);
  if (!feeLookupResult.ok) {
    throw new RefundFeeUnavailableError("Stripe processing fee is not available yet", feeLookupResult.failure);
  }

  const feeBreakdown = feeLookupResult.breakdown;
  const stripeFeeJpy = feeBreakdown.feeJpy;
  const refundAmountJpy = originalAmountJpy - stripeFeeJpy;
  if (!Number.isInteger(refundAmountJpy) || refundAmountJpy <= 0) {
    throw new RefundAmountInvalidError();
  }

  await client.query(
    `UPDATE bookings
     SET stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
         stripe_payment_fee_jpy = $3,
         stripe_balance_transaction_id = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [booking.id, paymentIntentId, stripeFeeJpy, feeBreakdown.balanceTransactionId]
  );

  return {
    paymentIntentId,
    originalAmountJpy,
    stripeFeeJpy,
    refundAmountJpy,
    stripeBalanceTransactionId: feeBreakdown.balanceTransactionId,
    stripeChargeCurrency: feeBreakdown.chargeCurrency,
    stripeBalanceTransactionCurrency: feeBreakdown.balanceTransactionCurrency,
    stripeBalanceTransactionFee: feeBreakdown.balanceTransactionFee,
    stripeExchangeRate: feeBreakdown.exchangeRate,
  };
}
