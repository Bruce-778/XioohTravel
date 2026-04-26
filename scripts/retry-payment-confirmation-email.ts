import "dotenv/config";
import { db } from "@/lib/db";
import { sendPaymentConfirmationEmailIfNeeded } from "@/lib/paymentConfirmation";

const DEFAULT_BATCH_LIMIT = 20;

type RetryMode =
  | {
      kind: "single";
      bookingId: string;
    }
  | {
      kind: "all-unsent";
      limit: number;
    };

function parseModeFromArgs(): RetryMode {
  const firstArg = process.argv[2]?.trim();

  if (!firstArg) {
    throw new Error(
      "Usage: npm run retry:payment-confirmation-email -- <BOOKING_ID>\n   or: npm run retry:payment-confirmation-email -- --all-unsent [limit]"
    );
  }

  if (firstArg === "--all-unsent") {
    const rawLimit = Number(process.argv[3] ?? DEFAULT_BATCH_LIMIT);
    if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
      throw new Error("Batch limit must be a positive number");
    }

    return {
      kind: "all-unsent",
      limit: Math.min(Math.floor(rawLimit), 100),
    };
  }

  return {
    kind: "single",
    bookingId: firstArg,
  };
}

async function getUnsentPaidBookingIds(limit: number) {
  const result = await db.query(
    `SELECT id
     FROM bookings
     WHERE stripe_payment_status = 'paid'
       AND payment_confirmation_email_sent_at IS NULL
       AND status IN ('PAID', 'CONFIRMED')
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );

  return (result.rows as Array<{ id: string }>).map((row) => row.id);
}

async function main() {
  const mode = parseModeFromArgs();

  if (mode.kind === "single") {
    const result = await sendPaymentConfirmationEmailIfNeeded(mode.bookingId);

    console.log(
      JSON.stringify(
        {
          bookingId: mode.bookingId,
          ...result,
        },
        null,
        2
      )
    );
    return;
  }

  const bookingIds = await getUnsentPaidBookingIds(mode.limit);

  if (bookingIds.length === 0) {
    console.log("No unsent paid bookings found.");
    return;
  }

  const results: Array<{
    bookingId: string;
    ok: boolean;
    result?: Awaited<ReturnType<typeof sendPaymentConfirmationEmailIfNeeded>>;
    error?: string;
  }> = [];

  for (const bookingId of bookingIds) {
    try {
      const result = await sendPaymentConfirmationEmailIfNeeded(bookingId);
      results.push({
        bookingId,
        ok: true,
        result,
      });
    } catch (error: any) {
      results.push({
        bookingId,
        ok: false,
        error: error?.message ?? "Unknown error",
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error("Failed to retry payment confirmation email:", error);
  process.exitCode = 1;
});
