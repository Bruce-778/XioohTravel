import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CancelBookingSchema } from "@/lib/validators";
import { canUserCancel } from "@/lib/bookingRules";
import { getT } from "@/lib/i18n";
import { sendMerchantRefundNotificationIfNeeded } from "@/lib/merchantNotification";
import { sendRefundConfirmationEmailIfNeeded } from "@/lib/refundConfirmation";
import { createBookingRefund, retrieveCheckoutSessionWithPaymentIntent } from "@/lib/stripe";

function getPaymentIntentIdFromCheckoutSession(session: Awaited<ReturnType<typeof retrieveCheckoutSessionWithPaymentIntent>>) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

function isPaidBooking(booking: any) {
  return booking.stripe_payment_status === "paid" || booking.status === "PAID" || booking.status === "CONFIRMED";
}

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
      const now = new Date();
      const decision = canUserCancel(now, new Date(booking.pickup_time), booking.is_urgent);
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
        },
      });
    }

    let paymentIntentId = booking.stripe_payment_intent_id as string | null;
    if (!paymentIntentId && booking.stripe_checkout_session_id) {
      const checkoutSession = await retrieveCheckoutSessionWithPaymentIntent(booking.stripe_checkout_session_id);
      paymentIntentId = getPaymentIntentIdFromCheckoutSession(checkoutSession);

      if (paymentIntentId) {
        await client.query(
          `UPDATE bookings
           SET stripe_payment_intent_id = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [bookingId, paymentIntentId]
        );
      }
    }

    if (!paymentIntentId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.refundPaymentMissing") }, { status: 400 });
    }

    const amountJpy = Number(booking.pricing_total_jpy ?? 0);
    if (!Number.isFinite(amountJpy) || amountJpy <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.refundAmountInvalid") }, { status: 400 });
    }

    const refund = await createBookingRefund({
      bookingId,
      paymentIntentId,
      amountJpy,
    });
    const refundStatus = refund.status ?? "pending";
    const refundedAt = getRefundCompletedAt(refundStatus);

    await client.query(
      `UPDATE bookings
       SET status = 'CANCELLED',
           cancel_reason = $1,
           cancelled_at = NOW(),
           stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
           stripe_refund_id = $3,
           stripe_refund_status = $4,
           refund_amount_jpy = $5,
           refund_requested_at = NOW(),
           refunded_at = COALESCE(refunded_at, $6),
           refund_failure_reason = NULL,
           updated_at = NOW()
       WHERE id = $7`,
      [reason, paymentIntentId, refund.id, refundStatus, amountJpy, refundedAt, bookingId]
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
        amountJpy,
      },
    });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(e);
    if (e?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  } finally {
    client.release();
  }
}
