import "dotenv/config";
import { db } from "@/lib/db";

type BookingEmailStateRow = {
  id: string;
  status: string;
  stripe_payment_status: string | null;
  paid_at: Date | string | null;
  payment_confirmation_email_sent_at: Date | string | null;
  payment_confirmation_email_provider_id: string | null;
  contact_email: string;
};

const DEFAULT_LIMIT = 10;

function getLimitFromArgs() {
  const input = Number(process.argv[2] ?? DEFAULT_LIMIT);

  if (!Number.isFinite(input) || input <= 0) {
    throw new Error("Limit must be a positive number");
  }

  return Math.min(Math.floor(input), 50);
}

async function main() {
  const limit = getLimitFromArgs();
  const result = await db.query(
    `SELECT
       id,
       status,
       stripe_payment_status,
       paid_at,
       payment_confirmation_email_sent_at,
       payment_confirmation_email_provider_id,
       contact_email
     FROM bookings
     WHERE stripe_payment_status = 'paid'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  const rows = result.rows as BookingEmailStateRow[];

  if (rows.length === 0) {
    console.log("No paid bookings found.");
    return;
  }

  console.table(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      stripePaymentStatus: row.stripe_payment_status,
      paidAt: row.paid_at,
      emailSentAt: row.payment_confirmation_email_sent_at,
      providerId: row.payment_confirmation_email_provider_id,
      contactEmail: row.contact_email,
    }))
  );
}

main().catch((error) => {
  console.error("Failed to inspect payment confirmation email state:", error);
  process.exitCode = 1;
});
