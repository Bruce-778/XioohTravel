import "dotenv/config";
import { sendPaymentConfirmationEmailIfNeeded } from "@/lib/paymentConfirmation";

function getBookingIdFromArgs() {
  const bookingId = process.argv[2]?.trim();

  if (!bookingId) {
    throw new Error("Usage: npm run retry:payment-confirmation-email -- <BOOKING_ID>");
  }

  return bookingId;
}

async function main() {
  const bookingId = getBookingIdFromArgs();
  const result = await sendPaymentConfirmationEmailIfNeeded(bookingId);

  console.log(
    JSON.stringify(
      {
        bookingId,
        ...result,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to retry payment confirmation email:", error);
  process.exitCode = 1;
});
