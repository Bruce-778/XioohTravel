import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import {
  getPaymentConfirmationEmailDiagnostics,
  maskEmailForLog,
  normalizeEmailAddress,
  sendMerchantOrderNotificationEmail,
  sendMerchantRefundNotificationEmail,
  type PaymentConfirmationBooking,
  type RefundConfirmationBooking,
} from "@/lib/email";

type MerchantOrderBookingRow = PaymentConfirmationBooking & {
  stripe_payment_status: string | null;
  merchant_order_email_sent_at: Date | null;
  merchant_order_email_provider_id: string | null;
};

type MerchantRefundBookingRow = RefundConfirmationBooking & {
  cancel_reason: string | null;
  cancelled_at: Date | string | null;
  merchant_refund_email_sent_at: Date | null;
  merchant_refund_email_provider_id: string | null;
};

function getMerchantRecipients() {
  const rawEmails = process.env.MERCHANT_EMAILS?.trim();

  if (!rawEmails) {
    return [];
  }

  return Array.from(
    new Set(
      rawEmails
        .split(",")
        .map((email) => normalizeEmailAddress(email))
        .filter(Boolean)
    )
  );
}

async function getBookingForMerchantOrderNotification(client: PoolClient, bookingId: string) {
  const result = await client.query(
    `SELECT
       b.id,
       b.status,
       b.is_urgent,
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
       b.merchant_order_email_sent_at,
       b.merchant_order_email_provider_id,
       v.name AS vehicle_name
     FROM bookings b
     LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
     WHERE b.id = $1
     LIMIT 1
     FOR UPDATE OF b`,
    [bookingId]
  );

  const rows = result.rows as MerchantOrderBookingRow[];
  return rows[0] ?? null;
}

async function getBookingForMerchantRefundNotification(client: PoolClient, bookingId: string) {
  const result = await client.query(
    `SELECT
       b.id,
       b.status,
       b.is_urgent,
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
       b.paid_at,
       b.stripe_refund_id,
       b.stripe_refund_status,
       b.refund_amount_jpy,
       b.stripe_payment_fee_jpy,
       b.refund_fee_deducted_jpy,
       b.refund_requested_at,
       b.refunded_at,
       b.cancel_reason,
       b.cancelled_at,
       b.merchant_refund_email_sent_at,
       b.merchant_refund_email_provider_id,
       v.name AS vehicle_name
     FROM bookings b
     LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
     WHERE b.id = $1
     LIMIT 1
     FOR UPDATE OF b`,
    [bookingId]
  );

  const rows = result.rows as MerchantRefundBookingRow[];
  return rows[0] ?? null;
}

export async function sendMerchantOrderNotificationIfNeeded(bookingId: string) {
  const client = await db.pool.connect();

  try {
    const recipients = getMerchantRecipients();
    console.info("[merchant_notification] Checking paid booking notification", {
      bookingId,
      recipientCount: recipients.length,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
    });

    if (recipients.length === 0) {
      return { sent: false as const, reason: "no_recipients" as const };
    }

    await client.query("BEGIN");
    const booking = await getBookingForMerchantOrderNotification(client, bookingId);

    if (!booking) {
      throw new Error("Booking not found for merchant order notification");
    }

    if (booking.merchant_order_email_sent_at) {
      await client.query("COMMIT");
      return { sent: false as const, reason: "already_sent" as const };
    }

    const isPaid = booking.stripe_payment_status === "paid" || booking.status === "PAID" || booking.status === "CONFIRMED";
    if (!isPaid) {
      await client.query("COMMIT");
      return { sent: false as const, reason: "not_paid" as const };
    }

    console.info("[merchant_notification] Sending paid booking notification", {
      bookingId,
      contactEmail: maskEmailForLog(booking.contact_email),
      recipientCount: recipients.length,
    });

    const emailResult = await sendMerchantOrderNotificationEmail({ booking, recipients });

    await client.query(
      `UPDATE bookings
       SET merchant_order_email_sent_at = NOW(),
           merchant_order_email_provider_id = COALESCE($2, merchant_order_email_provider_id),
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, emailResult.providerId]
    );

    await client.query("COMMIT");

    return {
      sent: true as const,
      providerId: emailResult.providerId,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[merchant_notification] Failed to send paid booking notification", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function sendMerchantRefundNotificationIfNeeded(bookingId: string) {
  const client = await db.pool.connect();

  try {
    const recipients = getMerchantRecipients();
    console.info("[merchant_notification] Checking refund notification", {
      bookingId,
      recipientCount: recipients.length,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
    });

    if (recipients.length === 0) {
      return { sent: false as const, reason: "no_recipients" as const };
    }

    await client.query("BEGIN");
    const booking = await getBookingForMerchantRefundNotification(client, bookingId);

    if (!booking) {
      throw new Error("Booking not found for merchant refund notification");
    }

    if (booking.merchant_refund_email_sent_at) {
      await client.query("COMMIT");
      return { sent: false as const, reason: "already_sent" as const };
    }

    if (!booking.stripe_refund_id) {
      await client.query("COMMIT");
      return { sent: false as const, reason: "refund_missing" as const };
    }

    console.info("[merchant_notification] Sending refund notification", {
      bookingId,
      refundId: booking.stripe_refund_id,
      contactEmail: maskEmailForLog(booking.contact_email),
      recipientCount: recipients.length,
    });

    const emailResult = await sendMerchantRefundNotificationEmail({ booking, recipients });

    await client.query(
      `UPDATE bookings
       SET merchant_refund_email_sent_at = NOW(),
           merchant_refund_email_provider_id = COALESCE($2, merchant_refund_email_provider_id),
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, emailResult.providerId]
    );

    await client.query("COMMIT");

    return {
      sent: true as const,
      providerId: emailResult.providerId,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[merchant_notification] Failed to send refund notification", {
      bookingId,
      diagnostics: getPaymentConfirmationEmailDiagnostics(),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}
