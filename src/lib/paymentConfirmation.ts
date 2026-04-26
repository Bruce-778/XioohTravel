import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import {
  getPaymentConfirmationEmailDiagnostics,
  maskEmailForLog,
  sendBookingPaymentConfirmationEmail,
  type PaymentConfirmationBooking,
} from "@/lib/email";

type PaymentConfirmationBookingRow = PaymentConfirmationBooking & {
  stripe_payment_status: string | null;
  payment_confirmation_email_sent_at: Date | null;
  payment_confirmation_email_provider_id: string | null;
};

async function getBookingForPaymentConfirmation(client: PoolClient, bookingId: string) {
  const result = await client.query(
    `SELECT
       b.id,
       b.status,
       b.trip_type,
       b.pickup_time,
       b.pickup_location,
       b.dropoff_location,
       b.flight_number,
       b.flight_note,
       b.passengers,
       b.child_seats,
       b.meet_and_greet_sign,
       b.luggage_small,
       b.luggage_medium,
       b.luggage_large,
       b.contact_name,
       b.contact_phone,
       b.contact_email,
       b.contact_note,
       b.pricing_meet_and_greet_jpy,
       b.pricing_total_jpy,
       b.stripe_payment_intent_id,
       b.stripe_payment_status,
       b.paid_at,
       b.payment_confirmation_email_sent_at,
       b.payment_confirmation_email_provider_id,
       v.name AS vehicle_name
     FROM bookings b
     LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
     WHERE b.id = $1
     LIMIT 1
     FOR UPDATE OF b`,
    [bookingId]
  );

  const rows = result.rows as PaymentConfirmationBookingRow[];
  return rows[0] ?? null;
}

export async function sendPaymentConfirmationEmailIfNeeded(bookingId: string) {
  const client = await db.pool.connect();

  try {
    console.info("[payment_confirmation] Checking booking", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
    });

    await client.query("BEGIN");
    const booking = await getBookingForPaymentConfirmation(client, bookingId);

    if (!booking) {
      throw new Error("Booking not found for payment confirmation email");
    }

    if (booking.payment_confirmation_email_sent_at) {
      console.info("[payment_confirmation] Skipping already-sent booking", {
        bookingId,
        sentAt: booking.payment_confirmation_email_sent_at,
        providerId: booking.payment_confirmation_email_provider_id,
      });
      await client.query("COMMIT");
      return { sent: false as const, reason: "already_sent" as const };
    }

    const isPaid = booking.stripe_payment_status === "paid" || booking.status === "PAID" || booking.status === "CONFIRMED";
    if (!isPaid) {
      console.info("[payment_confirmation] Skipping unpaid booking", {
        bookingId,
        status: booking.status,
        stripePaymentStatus: booking.stripe_payment_status,
      });
      await client.query("COMMIT");
      return { sent: false as const, reason: "not_paid" as const };
    }

    console.info("[payment_confirmation] Sending booking payment confirmation", {
      bookingId,
      status: booking.status,
      stripePaymentStatus: booking.stripe_payment_status,
      contactEmail: maskEmailForLog(booking.contact_email),
    });

    const emailResult = await sendBookingPaymentConfirmationEmail(booking);

    await client.query(
      `UPDATE bookings
       SET payment_confirmation_email_sent_at = NOW(),
           payment_confirmation_email_provider_id = COALESCE($2, payment_confirmation_email_provider_id),
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, emailResult.providerId]
    );

    await client.query("COMMIT");

    console.info("[payment_confirmation] Marked booking payment confirmation as sent", {
      bookingId,
      providerId: emailResult.providerId,
    });

    return {
      sent: true as const,
      providerId: emailResult.providerId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[payment_confirmation] Failed to send booking payment confirmation", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}
