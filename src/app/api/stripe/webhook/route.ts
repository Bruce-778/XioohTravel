import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  syncBookingPaymentFeeFromPaymentIntentId,
  syncBookingPaymentFromCheckoutSession,
  syncBookingRefundFromStripeRefund,
} from "@/lib/bookings";
import { getPaymentConfirmationEmailDiagnostics, sendOpsAlertEmail } from "@/lib/email";
import { sendMerchantRefundNotificationIfNeeded } from "@/lib/merchantNotification";
import { sendPaymentConfirmationEmailIfNeeded } from "@/lib/paymentConfirmation";
import { sendRefundConfirmationEmailIfNeeded } from "@/lib/refundConfirmation";
import { createSafetyRefund, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function getSessionPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

async function handlePaidCheckoutSession(eventId: string, session: Stripe.Checkout.Session) {
  const syncResult = await syncBookingPaymentFromCheckoutSession(session);
  const bookingId = syncResult.bookingId;

  console.info("[stripe_webhook] Synced booking payment status", {
    eventId,
    bookingId,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    cancelledButPaid: syncResult.cancelledButPaid,
    duplicatePaymentIntentId: syncResult.duplicatePaymentIntentId,
    amountMismatch: syncResult.amountMismatch,
  });

  if (session.payment_status !== "paid") {
    return;
  }

  if (syncResult.amountMismatch) {
    await sendOpsAlertEmail({
      subject: `订单 ${bookingId} 实付金额与订单总额不一致`,
      lines: [
        `订单号: ${bookingId}`,
        `Checkout Session: ${session.id}`,
        `订单总额(JPY): ${syncResult.amountMismatch.expectedJpy}`,
        `实付金额(JPY): ${syncResult.amountMismatch.paidJpy}`,
        "请在 Stripe 后台核对该笔收款。",
      ],
      idempotencyKey: `amount-mismatch-alert-${session.id}`,
    }).catch(() => undefined);
  }

  if (syncResult.duplicatePaymentIntentId) {
    // A second charge landed on an already-paid booking: refund it in full.
    const refund = await createSafetyRefund({
      paymentIntentId: syncResult.duplicatePaymentIntentId,
      idempotencyKey: `duplicate-payment-refund-${session.id}`,
      metadata: {
        reason: "duplicate_payment_auto_refund",
        duplicateOfBookingId: bookingId,
      },
    });

    console.error("[stripe_webhook] Auto-refunded duplicate payment", {
      eventId,
      bookingId,
      sessionId: session.id,
      paymentIntentId: syncResult.duplicatePaymentIntentId,
      refundId: refund.id,
    });

    await sendOpsAlertEmail({
      subject: `订单 ${bookingId} 出现重复支付，已自动全额退款`,
      lines: [
        `订单号: ${bookingId}`,
        `重复支付的 PaymentIntent: ${syncResult.duplicatePaymentIntentId}`,
        `自动退款编号: ${refund.id}（状态: ${refund.status ?? "pending"}）`,
        "订单本身保持已支付状态，无需人工处理，仅供知悉。",
      ],
      idempotencyKey: `duplicate-payment-alert-${session.id}`,
    }).catch(() => undefined);
    return;
  }

  if (syncResult.cancelledButPaid) {
    // Payment completed after the booking was cancelled: refund it in full.
    const paymentIntentId = getSessionPaymentIntentId(session);
    let refundId: string | null = null;

    if (paymentIntentId) {
      const refund = await createSafetyRefund({
        paymentIntentId,
        idempotencyKey: `cancelled-paid-refund-${session.id}`,
        metadata: {
          bookingId,
          reason: "paid_after_cancellation_auto_refund",
        },
      });
      refundId = refund.id;

      console.error("[stripe_webhook] Auto-refunded payment on cancelled booking", {
        eventId,
        bookingId,
        sessionId: session.id,
        paymentIntentId,
        refundId,
      });
    }

    await sendOpsAlertEmail({
      subject: `已取消订单 ${bookingId} 收到付款${refundId ? "，已自动全额退款" : "，自动退款失败需人工处理"}`,
      lines: [
        `订单号: ${bookingId}（状态: 已取消）`,
        `Checkout Session: ${session.id}`,
        refundId
          ? `自动退款编号: ${refundId}`
          : "未能定位 PaymentIntent，请在 Stripe 后台手动退款！",
      ],
      idempotencyKey: `cancelled-paid-alert-${session.id}`,
    }).catch(() => undefined);
    return;
  }

  const emailResult = await sendPaymentConfirmationEmailIfNeeded(bookingId);

  console.info("[stripe_webhook] Payment confirmation email result", {
    eventId,
    bookingId,
    emailResult,
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook signature missing" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Invalid webhook signature" }, { status: 400 });
  }

  try {
    console.info("[stripe_webhook] Received event", {
      eventId: event.id,
      eventType: event.type,
    });

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await handlePaidCheckoutSession(event.id, event.data.object as Stripe.Checkout.Session);
    } else if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      // The booking stays PENDING_PAYMENT so the customer can retry from the
      // orders page; we only record the event for operations visibility.
      console.warn("[stripe_webhook] Checkout session did not complete", {
        eventId: event.id,
        eventType: event.type,
        sessionId: session.id,
        bookingId: session.client_reference_id ?? session.metadata?.bookingId ?? null,
      });
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = typeof paymentIntent.metadata?.bookingId === "string" ? paymentIntent.metadata.bookingId : null;

      const syncedBookingId = await syncBookingPaymentFeeFromPaymentIntentId(paymentIntent.id, bookingId).catch((error) => {
        console.error("[stripe_webhook] Failed to sync Stripe payment fee", {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          bookingId,
          error,
        });
        return null;
      });

      console.info("[stripe_webhook] Payment fee sync result", {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        bookingId: syncedBookingId,
      });
    } else if (event.type === "charge.succeeded" || event.type === "charge.updated") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      const bookingId = typeof charge.metadata?.bookingId === "string" ? charge.metadata.bookingId : null;

      if (paymentIntentId) {
        const syncedBookingId = await syncBookingPaymentFeeFromPaymentIntentId(paymentIntentId, bookingId).catch((error) => {
          console.error("[stripe_webhook] Failed to sync Stripe payment fee from charge event", {
            eventId: event.id,
            eventType: event.type,
            chargeId: charge.id,
            paymentIntentId,
            bookingId,
            error,
          });
          return null;
        });

        console.info("[stripe_webhook] Charge fee sync result", {
          eventId: event.id,
          eventType: event.type,
          chargeId: charge.id,
          paymentIntentId,
          bookingId: syncedBookingId,
        });
      }
    } else if (
      event.type === "refund.created" ||
      event.type === "refund.updated" ||
      event.type === "refund.failed"
    ) {
      const refund = event.data.object as Stripe.Refund;
      const bookingId = await syncBookingRefundFromStripeRefund(refund);

      console.info("[stripe_webhook] Synced booking refund status", {
        eventId: event.id,
        bookingId,
        refundId: refund.id,
        refundStatus: refund.status,
      });

      const refundFailed = refund.status === "failed" || refund.status === "canceled";
      if (refundFailed) {
        // A failed refund means the customer has NOT received their money back;
        // alert the merchant so it can be retried manually in the Stripe dashboard.
        await sendOpsAlertEmail({
          subject: `退款失败${bookingId ? `：订单 ${bookingId}` : ""}，客户尚未收到退款`,
          lines: [
            bookingId ? `订单号: ${bookingId}` : "订单号: 未能关联",
            `退款编号: ${refund.id}`,
            `退款金额: ${refund.amount}（${(refund.currency ?? "jpy").toUpperCase()} 最小单位）`,
            `失败原因: ${refund.failure_reason ?? "未知"}`,
            "请尽快在 Stripe 后台手动重新发起退款，并联系客户说明情况。",
          ],
          idempotencyKey: `refund-failed-alert-${refund.id}`,
        }).catch(() => undefined);
      }

      if (bookingId && !refundFailed) {
        await sendMerchantRefundNotificationIfNeeded(bookingId).catch((error) => {
          console.error("[stripe_webhook] Failed to send merchant refund notification", {
            eventId: event.id,
            bookingId,
            refundId: refund.id,
            error,
          });
        });
      }

      if (bookingId && refund.status === "succeeded") {
        const emailResult = await sendRefundConfirmationEmailIfNeeded(bookingId);

        console.info("[stripe_webhook] Refund confirmation email result", {
          eventId: event.id,
          bookingId,
          emailResult,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[stripe_webhook] Handler failed", {
      eventId: event.id,
      eventType: event.type,
      emailDiagnostics: getPaymentConfirmationEmailDiagnostics(),
      error,
    });
    return NextResponse.json({ error: error?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
