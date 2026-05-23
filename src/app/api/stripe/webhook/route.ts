import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  syncBookingPaymentFeeFromPaymentIntentId,
  syncBookingPaymentFromCheckoutSession,
  syncBookingRefundFromStripeRefund,
} from "@/lib/bookings";
import { getPaymentConfirmationEmailDiagnostics } from "@/lib/email";
import { sendMerchantRefundNotificationIfNeeded } from "@/lib/merchantNotification";
import { sendPaymentConfirmationEmailIfNeeded } from "@/lib/paymentConfirmation";
import { sendRefundConfirmationEmailIfNeeded } from "@/lib/refundConfirmation";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

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
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = await syncBookingPaymentFromCheckoutSession(session);

      console.info("[stripe_webhook] Synced booking payment status", {
        eventId: event.id,
        bookingId,
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });

      if (session.payment_status === "paid") {
        const emailResult = await sendPaymentConfirmationEmailIfNeeded(bookingId);

        console.info("[stripe_webhook] Payment confirmation email result", {
          eventId: event.id,
          bookingId,
          emailResult,
        });
      }
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

      if (bookingId) {
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
