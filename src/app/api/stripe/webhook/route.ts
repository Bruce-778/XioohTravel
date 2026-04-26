import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { syncBookingPaymentFromCheckoutSession } from "@/lib/bookings";
import { getPaymentConfirmationEmailDiagnostics } from "@/lib/email";
import { sendPaymentConfirmationEmailIfNeeded } from "@/lib/paymentConfirmation";
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
