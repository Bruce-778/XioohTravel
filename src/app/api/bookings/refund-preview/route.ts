import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserAccessibleEmails } from "@/lib/bookings";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import {
  calculateBookingRefundPreview,
  getPaidCancellationDecision,
  isPaidBooking,
  RefundAmountInvalidError,
  RefundFeeUnavailableError,
  RefundPaymentMissingError,
} from "@/lib/refundAmounts";
import { RefundPreviewSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const { t } = await getT();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
  }
  const accessibleEmails = (await getUserAccessibleEmails(session.userId, session.email)).map((email) =>
    email.trim().toLowerCase()
  );

  const client = await db.pool.connect();

  try {
    const json = await req.json();
    const parsed = RefundPreviewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { bookingId } = parsed.data;

    await client.query("BEGIN");

    const { rows: bookings } = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (bookings.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }

    const booking = bookings[0];
    if (!accessibleEmails.includes(String(booking.contact_email ?? "").trim().toLowerCase())) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.emailMismatch") }, { status: 403 });
    }

    if (booking.status === "CANCELLED" || booking.status === "COMPLETED" || !isPaidBooking(booking)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t("api.invalidParams") }, { status: 400 });
    }

    const decision = getPaidCancellationDecision(booking);
    if (!decision.ok) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: t(decision.reason) }, { status: 400 });
    }

    const preview = await calculateBookingRefundPreview(client, booking);
    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      originalAmountJpy: preview.originalAmountJpy,
      stripeFeeJpy: preview.stripeFeeJpy,
      refundAmountJpy: preview.refundAmountJpy,
      stripeChargeCurrency: preview.stripeChargeCurrency,
      stripeBalanceTransactionCurrency: preview.stripeBalanceTransactionCurrency,
      stripeBalanceTransactionFee: preview.stripeBalanceTransactionFee,
      stripeExchangeRate: preview.stripeExchangeRate,
    });
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => undefined);

    if (error instanceof RefundFeeUnavailableError) {
      console.warn("[refund_preview] Stripe actual fee is unavailable", {
        lookupFailure: error.lookupFailure,
      });
      return NextResponse.json({ error: t("api.refundFeeUnavailable") }, { status: 409 });
    }
    if (error instanceof RefundPaymentMissingError) {
      return NextResponse.json({ error: t("api.refundPaymentMissing") }, { status: 400 });
    }
    if (error instanceof RefundAmountInvalidError) {
      return NextResponse.json({ error: t("api.refundAmountInvalid") }, { status: 400 });
    }
    if (error?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }

    console.error("[refund_preview] Failed to calculate refund preview", {
      error,
    });
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  } finally {
    client.release();
  }
}
