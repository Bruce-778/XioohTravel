import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CancelBookingSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";
import { sendMerchantRefundNotificationIfNeeded } from "@/lib/merchantNotification";
import {
  calculateBookingRefundPreview,
  getPaidCancellationDecision,
  isPaidBooking,
  RefundAmountInvalidError,
  RefundFeeUnavailableError,
  RefundPaymentMissingError,
} from "@/lib/refundAmounts";
import { sendRefundConfirmationEmailIfNeeded } from "@/lib/refundConfirmation";
import { createBookingRefund } from "@/lib/stripe";

function getRefundCompletedAt(status: string | null | undefined) {
  return status === "succeeded" ? new Date() : null;
}

export async function POST(req: Request) {
  const { t } = await getT();
  const client = await db.pool.connect();

  try {
    const json = await req.json();
    const parsed = CancelBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }
    const { bookingId, contactEmail, reason } = parsed.data;

    await client.query("BEGIN");

    const { rows: bookings } = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (bookings.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }
    const booking = bookings[0];

    if (booking.contact_email !== contactEmail) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.emailMismatch") }, { status: 403 });
    }
    if (booking.status === "CANCELLED") {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true });
    }
    if (booking.status === "COMPLETED") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.cancelPast") }, { status: 400 });
    }

    const paidBooking = isPaidBooking(booking);
    if (paidBooking) {
      const decision = getPaidCancellationDecision(booking);
      if (!decision.ok) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: t(decision.reason) }, { status: 400 });
      }
    }

    if (!paidBooking) {
      await client.query(
        `UPDATE bookings
         SET status = 'CANCELLED',
             cancel_reason = $1,
             cancelled_at = NOW(),
             stripe_refund_status = COALESCE(stripe_refund_status, 'not_required'),
             updated_at = NOW()
         WHERE id = $2`,
        [reason, bookingId]
      );

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, refund: { required: false } });
    }

    if (booking.stripe_refund_id) {
      await client.query(
        `UPDATE bookings
         SET status = 'CANCELLED',
             cancel_reason = COALESCE(cancel_reason, $1),
             cancelled_at = COALESCE(cancelled_at, NOW()),
             updated_at = NOW()
         WHERE id = $2`,
        [reason, bookingId]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        ok: true,
        refund: {
          required: true,
          id: booking.stripe_refund_id,
          status: booking.stripe_refund_status,
          amountJpy: booking.refund_amount_jpy,
          feeDeductedJpy: booking.refund_fee_deducted_jpy ?? booking.stripe_payment_fee_jpy ?? null,
        },
      });
    }

    const refundPreview = await calculateBookingRefundPreview(client, booking);

    const refund = await createBookingRefund({
      bookingId,
      paymentIntentId: refundPreview.paymentIntentId,
      amountJpy: refundPreview.refundAmountJpy,
      originalAmountJpy: refundPreview.originalAmountJpy,
      stripeFeeDeductedJpy: refundPreview.stripeFeeJpy,
      stripeBalanceTransactionId: refundPreview.stripeBalanceTransactionId,
      stripeBalanceTransactionCurrency: refundPreview.stripeBalanceTransactionCurrency,
      stripeBalanceTransactionFee: refundPreview.stripeBalanceTransactionFee,
      stripeExchangeRate: refundPreview.stripeExchangeRate,
    });
    const refundStatus = refund.status ?? "pending";
    const refundedAt = getRefundCompletedAt(refundStatus);

    await client.query(
      `UPDATE bookings
       SET status = 'CANCELLED',
           cancel_reason = $1,
           cancelled_at = NOW(),
           stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
           stripe_payment_fee_jpy = $8,
           stripe_balance_transaction_id = $9,
           stripe_refund_id = $3,
           stripe_refund_status = $4,
           refund_amount_jpy = $5,
           refund_fee_deducted_jpy = $10,
           refund_requested_at = NOW(),
           refunded_at = COALESCE(refunded_at, $6),
           refund_failure_reason = NULL,
           updated_at = NOW()
       WHERE id = $7`,
      [
        reason,
        refundPreview.paymentIntentId,
        refund.id,
        refundStatus,
        refundPreview.refundAmountJpy,
        refundedAt,
        bookingId,
        refundPreview.stripeFeeJpy,
        refundPreview.stripeBalanceTransactionId,
        refundPreview.stripeFeeJpy,
      ]
    );

    await client.query("COMMIT");

    await sendMerchantRefundNotificationIfNeeded(bookingId).catch((error) => {
      console.error("[cancel_booking] Failed to send merchant refund notification", {
        bookingId,
        refundId: refund.id,
        error,
      });
    });

    if (refundStatus === "succeeded") {
      await sendRefundConfirmationEmailIfNeeded(bookingId).catch((error) => {
        console.error("[cancel_booking] Failed to send refund confirmation email", {
          bookingId,
          refundId: refund.id,
          error,
        });
      });
    }

    return NextResponse.json({
      ok: true,
      refund: {
        required: true,
        id: refund.id,
        status: refundStatus,
        amountJpy: refundPreview.refundAmountJpy,
        feeDeductedJpy: refundPreview.stripeFeeJpy,
      },
    });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (e instanceof RefundFeeUnavailableError) {
      console.warn("[cancel_booking] Stripe actual fee is unavailable; blocking self-service refund", {
        lookupFailure: e.lookupFailure,
      });
      return NextResponse.json({ error: t("api.refundFeeUnavailable") }, { status: 409 });
    }
    if (e instanceof RefundPaymentMissingError) {
      return NextResponse.json({ error: t("api.refundPaymentMissing") }, { status: 400 });
    }
    if (e instanceof RefundAmountInvalidError) {
      return NextResponse.json({ error: t("api.refundAmountInvalid") }, { status: 400 });
    }
    console.error(e);
    if (e?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  } finally {
    client.release();
  }
}
