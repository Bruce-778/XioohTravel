import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import {
  getPaymentConfirmationEmailDiagnostics,
  maskEmailForLog,
  sendBookingRefundConfirmationEmail,
  type RefundConfirmationBooking,
} from "@/lib/email";

type RefundConfirmationBookingRow = RefundConfirmationBooking & {
  refund_confirmation_email_sent_at: Date | null;
  refund_confirmation_email_provider_id: string | null;
};

async function getBookingForRefundConfirmation(client: PoolClient, bookingId: string) {
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
	       b.pricing_child_seat_jpy,
	       b.pricing_meet_and_greet_jpy,
       b.pricing_total_jpy,
       b.stripe_payment_intent_id,
       b.paid_at,
       b.stripe_refund_id,
       b.stripe_refund_status,
       b.refund_amount_jpy,
       b.stripe_payment_fee_jpy,
       b.refund_fee_deducted_jpy,
       b.refund_requested_at,
       b.refunded_at,
       b.refund_confirmation_email_sent_at,
       b.refund_confirmation_email_provider_id,
       v.name AS vehicle_name
     FROM bookings b
     LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
     WHERE b.id = $1
     LIMIT 1
     FOR UPDATE OF b`,
    [bookingId]
  );

  const rows = result.rows as RefundConfirmationBookingRow[];
  return rows[0] ?? null;
}

export async function sendRefundConfirmationEmailIfNeeded(bookingId: string) {
  const client = await db.pool.connect();

  try {
    console.info("[refund_confirmation] Checking booking", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
    });

    await client.query("BEGIN");
    const booking = await getBookingForRefundConfirmation(client, bookingId);

    if (!booking) {
      throw new Error("Booking not found for refund confirmation email");
    }

    if (booking.refund_confirmation_email_sent_at) {
      console.info("[refund_confirmation] Skipping already-sent booking", {
        bookingId,
        sentAt: booking.refund_confirmation_email_sent_at,
        providerId: booking.refund_confirmation_email_provider_id,
      });
      await client.query("COMMIT");
      return { sent: false as const, reason: "already_sent" as const };
    }

    if (booking.stripe_refund_status !== "succeeded") {
      console.info("[refund_confirmation] Skipping uncompleted refund", {
        bookingId,
        refundStatus: booking.stripe_refund_status,
      });
      await client.query("COMMIT");
      return { sent: false as const, reason: "refund_not_succeeded" as const };
    }

    console.info("[refund_confirmation] Sending booking refund confirmation", {
      bookingId,
      refundStatus: booking.stripe_refund_status,
      contactEmail: maskEmailForLog(booking.contact_email),
    });

    const emailResult = await sendBookingRefundConfirmationEmail(booking);

    await client.query(
      `UPDATE bookings
       SET refund_confirmation_email_sent_at = NOW(),
           refund_confirmation_email_provider_id = COALESCE($2, refund_confirmation_email_provider_id),
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, emailResult.providerId]
    );

    await client.query("COMMIT");

    console.info("[refund_confirmation] Marked booking refund confirmation as sent", {
      bookingId,
      providerId: emailResult.providerId,
    });

    return {
      sent: true as const,
      providerId: emailResult.providerId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[refund_confirmation] Failed to send booking refund confirmation", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}
