import { Resend } from "resend";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { getLocalizedLocation, VEHICLE_NAMES } from "@/lib/locationData";

export type PaymentConfirmationBooking = {
  id: string;
  status: string;
  trip_type: string;
  pickup_time: Date | string;
  pickup_location: string;
  dropoff_location: string;
  flight_number: string | null;
  flight_note: string | null;
  passengers: number;
  child_seats: number;
  luggage_small: number;
  luggage_medium: number;
  luggage_large: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_note: string | null;
  pricing_total_jpy: number;
  stripe_payment_intent_id: string | null;
  paid_at: Date | string | null;
  vehicle_name: string | null;
};

let resendClient: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

function getBookingEmailFrom() {
  if (!process.env.BOOKING_EMAIL_FROM) {
    throw new Error("BOOKING_EMAIL_FROM is not configured");
  }

  return process.env.BOOKING_EMAIL_FROM;
}

function getOrdersUrl(email: string) {
  if (!process.env.APP_BASE_URL) {
    throw new Error("APP_BASE_URL is not configured");
  }

  const baseUrl = process.env.APP_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/orders?email=${encodeURIComponent(email)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrencyJpy(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTripTypeLabel(tripType: string) {
  switch (tripType) {
    case "PICKUP":
      return "Pickup";
    case "DROPOFF":
      return "Drop-off";
    case "POINT_TO_POINT":
      return "Point-to-point";
    default:
      return tripType;
  }
}

function getVehicleLabel(vehicleName: string | null) {
  switch (vehicleName) {
    case VEHICLE_NAMES.ECONOMY_5:
      return "5-seater Economy";
    case VEHICLE_NAMES.BUSINESS_7:
      return "7-seater Business";
    case VEHICLE_NAMES.LARGE_9:
      return "9-seater Large";
    case VEHICLE_NAMES.LUXURY:
      return "Luxury VIP";
    case VEHICLE_NAMES.BUS:
      return "Group Bus";
    default:
      return vehicleName ?? "Assigned vehicle";
  }
}

function buildLuggageSummary(booking: PaymentConfirmationBooking) {
  return [
    `${booking.luggage_small} small`,
    `${booking.luggage_medium} medium`,
    `${booking.luggage_large} large`,
  ].join(" / ");
}

function renderRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:12px 0;color:#475569;font-size:14px;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `;
}

export async function sendBookingPaymentConfirmationEmail(booking: PaymentConfirmationBooking) {
  const resend = getResend();
  const from = getBookingEmailFrom();
  const ordersUrl = getOrdersUrl(booking.contact_email);

  const tripType = getTripTypeLabel(booking.trip_type);
  const vehicle = getVehicleLabel(booking.vehicle_name);
  const pickupTime = formatDateTimeJST(booking.pickup_time, "en-US");
  const paidAt = booking.paid_at ? formatDateTimeJST(booking.paid_at, "en-US") : "Paid";
  const pickupLocation = getLocalizedLocation(booking.pickup_location, "en");
  const dropoffLocation = getLocalizedLocation(booking.dropoff_location, "en");
  const luggage = buildLuggageSummary(booking);
  const totalPaid = formatCurrencyJpy(Number(booking.pricing_total_jpy ?? 0));
  const subject = `Payment confirmed - XioohTravel booking ${booking.id}`;

  const details = [
    renderRow("Booking ID", booking.id),
    renderRow("Payment status", "Paid"),
    renderRow("Trip type", tripType),
    renderRow("Vehicle", vehicle),
    renderRow("Pickup time (JST)", pickupTime),
    renderRow("Paid at", paidAt),
    renderRow("Pickup", pickupLocation),
    renderRow("Drop-off", dropoffLocation),
    renderRow("Contact", booking.contact_name),
    renderRow("Phone", booking.contact_phone),
    renderRow("Email", booking.contact_email),
    renderRow("Passengers", String(booking.passengers)),
    renderRow("Child seats", String(booking.child_seats)),
    renderRow("Luggage", luggage),
    renderRow("Total paid", totalPaid),
  ];

  if (booking.flight_number) {
    details.splice(8, 0, renderRow("Flight number", booking.flight_number));
  }

  if (booking.flight_note) {
    details.push(renderRow("Flight note", booking.flight_note));
  }

  if (booking.contact_note) {
    details.push(renderRow("Special request", booking.contact_note));
  }

  if (booking.stripe_payment_intent_id) {
    details.push(renderRow("Stripe payment", booking.stripe_payment_intent_id));
  }

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <div style="padding:32px;background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">XioohTravel</div>
              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Payment received</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.92;">
                Your transfer has been recorded successfully. You can use the summary below as your booking confirmation.
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                ${details.join("")}
              </table>

              <div style="margin-top:28px;padding:20px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;">
                <div style="font-size:16px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">Manage your booking</div>
                <div style="font-size:14px;line-height:1.7;color:#1e3a8a;margin-bottom:14px;">
                  Need to review your order later? Open your booking list from the link below.
                </div>
                <a
                  href="${escapeHtml(ordersUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:999px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;"
                >
                  View my orders
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "XioohTravel payment confirmation",
    "",
    `Booking ID: ${booking.id}`,
    "Payment status: Paid",
    `Trip type: ${tripType}`,
    `Vehicle: ${vehicle}`,
    `Pickup time (JST): ${pickupTime}`,
    `Pickup: ${pickupLocation}`,
    `Drop-off: ${dropoffLocation}`,
    `Contact: ${booking.contact_name}`,
    `Phone: ${booking.contact_phone}`,
    `Email: ${booking.contact_email}`,
    `Passengers: ${booking.passengers}`,
    `Child seats: ${booking.child_seats}`,
    `Luggage: ${luggage}`,
    `Total paid: ${totalPaid}`,
    booking.flight_number ? `Flight number: ${booking.flight_number}` : null,
    booking.flight_note ? `Flight note: ${booking.flight_note}` : null,
    booking.contact_note ? `Special request: ${booking.contact_note}` : null,
    booking.stripe_payment_intent_id ? `Stripe payment: ${booking.stripe_payment_intent_id}` : null,
    "",
    `View your orders: ${ordersUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await resend.emails.send({
    from,
    to: booking.contact_email,
    subject,
    html,
    text,
    ...(process.env.BOOKING_EMAIL_REPLY_TO
      ? { replyTo: process.env.BOOKING_EMAIL_REPLY_TO }
      : {}),
  });

  if (response.error) {
    throw new Error(response.error.message || "Failed to send payment confirmation email");
  }

  return {
    providerId: response.data?.id ?? null,
  };
}
