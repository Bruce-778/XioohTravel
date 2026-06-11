import https from "node:https";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { getLocalizedLocation, VEHICLE_NAMES } from "@/lib/locationData";

type AuthVerificationEmailParams = {
  email: string;
  code: string;
  expiresInMinutes: number;
};

export type PaymentConfirmationBooking = {
  id: string;
  status: string;
  is_urgent?: boolean;
  trip_type: string;
  pickup_time: Date | string;
  pickup_location: string;
  dropoff_location: string;
  flight_number: string | null;
  flight_note: string | null;
  passengers: number;
  child_seats: number;
  meet_and_greet_sign: boolean;
  luggage_small: number;
  luggage_medium: number;
  luggage_large: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_note: string | null;
  pricing_child_seat_jpy: number;
  pricing_meet_and_greet_jpy: number;
  pricing_total_jpy: number;
  stripe_payment_intent_id: string | null;
  paid_at: Date | string | null;
  vehicle_name: string | null;
};

export type RefundConfirmationBooking = PaymentConfirmationBooking & {
  stripe_refund_id: string | null;
  stripe_refund_status: string | null;
  refund_amount_jpy: number | null;
  stripe_payment_fee_jpy: number | null;
  refund_fee_deducted_jpy: number | null;
  refund_requested_at: Date | string | null;
  refunded_at: Date | string | null;
};

const PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS = 3;
const PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS = [1000, 3000];

export function maskEmailForLog(email: string) {
  const normalized = email.trim();
  const separatorIndex = normalized.indexOf("@");

  if (separatorIndex <= 1) {
    return "***";
  }

  return `${normalized.slice(0, 2)}***${normalized.slice(separatorIndex)}`;
}

export function getPaymentConfirmationEmailDiagnostics() {
  const from = process.env.BOOKING_EMAIL_FROM?.trim() || null;

  return {
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    hasBookingEmailFrom: Boolean(from),
    hasBookingEmailTestTo: Boolean(process.env.BOOKING_EMAIL_TEST_TO?.trim()),
    hasAppBaseUrl: Boolean(process.env.APP_BASE_URL),
    usingResendDevSender: Boolean(from && isResendDevSender(from)),
  };
}

type ResendLikeError = {
  name?: string;
  statusCode?: number | null;
  message?: string;
};

type ResendRequestError = Error & {
  code?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function buildPaymentConfirmationIdempotencyKey(bookingId: string) {
  return `payment-confirmation-${bookingId}`;
}

function buildRefundConfirmationIdempotencyKey(bookingId: string, refundId: string | null) {
  return `refund-confirmation-${bookingId}-${refundId ?? "unknown"}`;
}

function buildMerchantOrderNotificationIdempotencyKey(bookingId: string) {
  return `merchant-order-notification-${bookingId}`;
}

function buildMerchantRefundNotificationIdempotencyKey(bookingId: string, refundId: string | null) {
  return `merchant-refund-notification-${bookingId}-${refundId ?? "unknown"}`;
}

function buildAuthVerificationIdempotencyKey(email: string, code: string) {
  return `auth-verification-${normalizeEmailAddress(email)}-${code}`;
}

function shouldRetryResendError(error: ResendLikeError | null | undefined) {
  if (!error) return false;
  if (error.statusCode === null) return true;
  if (typeof error.statusCode === "number" && (error.statusCode >= 500 || error.statusCode === 429)) {
    return true;
  }

  return error.name === "application_error" || error.name === "internal_server_error";
}

function isResendDevSender(from: string) {
  return from.toLowerCase().includes("onboarding@resend.dev");
}

function getResendApiKey() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return process.env.RESEND_API_KEY;
}

function getBookingEmailFrom() {
  if (!process.env.BOOKING_EMAIL_FROM) {
    throw new Error("BOOKING_EMAIL_FROM is not configured");
  }

  return process.env.BOOKING_EMAIL_FROM;
}

function getBookingEmailTestTo() {
  return process.env.BOOKING_EMAIL_TEST_TO?.trim() || null;
}

function getAuthEmailTestTo() {
  const testRecipient = process.env.AUTH_EMAIL_TEST_TO?.trim();
  return testRecipient ? normalizeEmailAddress(testRecipient) : null;
}

function getBookingEmailReplyTo() {
  return process.env.BOOKING_EMAIL_REPLY_TO?.trim() || null;
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

function createRequestError(code: string, message: string) {
  const error = new Error(message) as ResendRequestError;
  error.code = code;
  return error;
}

export function getAuthVerificationEmailDiagnostics() {
  const from = process.env.BOOKING_EMAIL_FROM?.trim() || null;

  return {
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    hasBookingEmailFrom: Boolean(from),
    hasAuthEmailTestTo: Boolean(process.env.AUTH_EMAIL_TEST_TO?.trim()),
    usingResendDevSender: Boolean(from && isResendDevSender(from)),
  };
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
  ].join(" / ");
}

function buildAdminUrl() {
  if (!process.env.APP_BASE_URL) {
    throw new Error("APP_BASE_URL is not configured");
  }

  const baseUrl = process.env.APP_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/admin`;
}

function renderRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:12px 0;color:#475569;font-size:14px;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `;
}

type ResendEmailPayload = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

async function sendResendEmailRequest(payload: ResendEmailPayload, idempotencyKey: string) {
  const apiKey = getResendApiKey();
  const requestBody = JSON.stringify({
    from: payload.from,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
  });

  return await new Promise<{
    data: { id?: string } | null;
    error: ResendLikeError | null;
  }>((resolve) => {
    const request = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          "Idempotency-Key": idempotencyKey,
        },
      },
      (response) => {
        let rawBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          rawBody += chunk;
        });
        response.on("end", () => {
          const statusCode = response.statusCode ?? null;

          try {
            const parsed = rawBody ? JSON.parse(rawBody) : {};

            if (statusCode && statusCode >= 200 && statusCode < 300) {
              resolve({
                data: parsed,
                error: null,
              });
              return;
            }

            resolve({
              data: null,
              error: {
                name: parsed?.name ?? "application_error",
                statusCode,
                message:
                  parsed?.message ??
                  response.statusMessage ??
                  "Failed to send payment confirmation email",
              },
            });
          } catch {
            resolve({
              data: null,
              error: {
                name: "application_error",
                statusCode,
                message:
                  rawBody ||
                  response.statusMessage ||
                  "Failed to send payment confirmation email",
              },
            });
          }
        });
      }
    );

    request.on("error", (error) => {
      resolve({
        data: null,
        error: {
          name: "application_error",
          statusCode: null,
          message: error.message || "Unable to reach Resend",
        },
      });
    });

    request.write(requestBody);
    request.end();
  });
}

export async function sendAuthVerificationCodeEmail({
  email,
  code,
  expiresInMinutes,
}: AuthVerificationEmailParams) {
  const diagnostics = getAuthVerificationEmailDiagnostics();
  const from = getBookingEmailFrom();
  const normalizedEmail = normalizeEmailAddress(email);
  const usingTestSender = isResendDevSender(from);
  const configuredTestRecipient = usingTestSender ? getAuthEmailTestTo() : null;

  if (usingTestSender && !configuredTestRecipient) {
    throw createRequestError(
      "AUTH_EMAIL_TEST_TO_MISSING",
      "AUTH_EMAIL_TEST_TO is required when using onboarding@resend.dev"
    );
  }

  if (usingTestSender && configuredTestRecipient !== normalizedEmail) {
    throw createRequestError(
      "AUTH_EMAIL_TEST_ONLY",
      "Authentication email testing is limited to the configured test inbox."
    );
  }

  const recipientEmail = configuredTestRecipient ?? normalizedEmail;
  const idempotencyKey = buildAuthVerificationIdempotencyKey(normalizedEmail, code);
  const subjectPrefix = usingTestSender ? "[Test Delivery] " : "";
  const subject = `${subjectPrefix}Your XioohTravel verification code`;
  const introText = usingTestSender
    ? `This is a test delivery for login verification. Because the sender is onboarding@resend.dev, verification emails are limited to the configured test inbox.`
    : "Use the verification code below to complete your XioohTravel login.";
  const replyTo = getBookingEmailReplyTo();

  console.info("[email] Sending auth verification code", {
    recipientEmail: maskEmailForLog(recipientEmail),
    requestedEmail: maskEmailForLog(normalizedEmail),
    usingTestSender,
    idempotencyKey,
    diagnostics,
  });

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <div style="padding:32px;background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">XioohTravel</div>
              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Your verification code</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.92;">${escapeHtml(introText)}</p>
            </div>

            <div style="padding:32px;">
              <div style="margin-bottom:24px;font-size:14px;line-height:1.7;color:#475569;">
                Enter this code on the login page within ${escapeHtml(String(expiresInMinutes))} minutes.
              </div>

              <div style="margin-bottom:28px;border-radius:20px;border:1px solid #bfdbfe;background:#eff6ff;padding:24px;text-align:center;">
                <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">Verification code</div>
                <div style="margin-top:12px;font-size:36px;font-weight:800;letter-spacing:0.3em;color:#0f172a;">${escapeHtml(code)}</div>
              </div>

              <table style="width:100%;border-collapse:collapse;">
                ${renderRow("Requested email", normalizedEmail)}
                ${usingTestSender ? renderRow("Delivery mode", "Test delivery via resend.dev") : ""}
                ${usingTestSender && configuredTestRecipient ? renderRow("Test inbox", configuredTestRecipient) : ""}
                ${renderRow("Valid for", `${expiresInMinutes} minutes`)}
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    `${subjectPrefix}XioohTravel verification code`,
    "",
    usingTestSender ? "Delivery mode: Test delivery via resend.dev" : null,
    usingTestSender && configuredTestRecipient ? `Test inbox: ${configuredTestRecipient}` : null,
    `Requested email: ${normalizedEmail}`,
    `Verification code: ${code}`,
    `Valid for: ${expiresInMinutes} minutes`,
  ]
    .filter(Boolean)
    .join("\n");

  const emailPayload: ResendEmailPayload = {
    from,
    to: recipientEmail,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  };

  for (let attempt = 1; attempt <= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS; attempt += 1) {
    const response = await sendResendEmailRequest(emailPayload, idempotencyKey);

    if (!response.error) {
      console.info("[email] Resend accepted auth verification code", {
        recipientEmail: maskEmailForLog(recipientEmail),
        providerId: response.data?.id ?? null,
        attempt,
      });

      return {
        providerId: response.data?.id ?? null,
      };
    }

    const retryable = shouldRetryResendError(response.error);
    console.error("[email] Resend rejected auth verification code", {
      recipientEmail: maskEmailForLog(recipientEmail),
      requestedEmail: maskEmailForLog(normalizedEmail),
      diagnostics,
      responseError: response.error,
      attempt,
      retryable,
    });

    if (!retryable || attempt >= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS) {
      throw new Error(response.error.message || "Failed to send verification code email");
    }

    const delayMs =
      PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[attempt - 1] ??
      PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS.length - 1] ??
      1000;
    console.warn("[email] Retrying auth verification code", {
      attempt,
      nextAttempt: attempt + 1,
      delayMs,
      recipientEmail: maskEmailForLog(recipientEmail),
    });
    await sleep(delayMs);
  }

  throw new Error("Failed to send verification code email");
}

export async function sendBookingPaymentConfirmationEmail(booking: PaymentConfirmationBooking) {
  const diagnostics = getPaymentConfirmationEmailDiagnostics();
  const from = getBookingEmailFrom();
  const usingTestSender = isResendDevSender(from);
  const testRecipient = usingTestSender ? getBookingEmailTestTo() : null;

  if (usingTestSender && !testRecipient) {
    throw new Error("BOOKING_EMAIL_TEST_TO is required when using onboarding@resend.dev");
  }

  const recipientEmail = testRecipient ?? booking.contact_email;
  const idempotencyKey = buildPaymentConfirmationIdempotencyKey(booking.id);
  console.info("[email] Sending booking payment confirmation", {
    bookingId: booking.id,
    from,
    usingTestSender,
    recipientEmail: maskEmailForLog(recipientEmail),
    originalCustomerEmail: maskEmailForLog(booking.contact_email),
    idempotencyKey,
    diagnostics,
  });

  const ordersUrl = getOrdersUrl(booking.contact_email);

  const tripType = getTripTypeLabel(booking.trip_type);
  const vehicle = getVehicleLabel(booking.vehicle_name);
  const pickupTime = formatDateTimeJST(booking.pickup_time, "en-US");
  const paidAt = booking.paid_at ? formatDateTimeJST(booking.paid_at, "en-US") : "Paid";
  const pickupLocation = getLocalizedLocation(booking.pickup_location, "en");
  const dropoffLocation = getLocalizedLocation(booking.dropoff_location, "en");
  const luggage = buildLuggageSummary(booking);
  const totalPaid = formatCurrencyJpy(Number(booking.pricing_total_jpy ?? 0));
  const subjectPrefix = usingTestSender ? "[Test Delivery] " : "";
  const subject = `${subjectPrefix}Payment confirmed - XioohTravel booking ${booking.id}`;
  const replyTo = getBookingEmailReplyTo();

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
    renderRow("Meet-and-greet sign", booking.meet_and_greet_sign ? "Yes" : "No"),
    renderRow("Luggage", luggage),
    renderRow("Total paid", totalPaid),
  ];

  if (Number(booking.pricing_meet_and_greet_jpy ?? 0) > 0) {
    details.splice(
      14,
      0,
      renderRow("Meet-and-greet fee", formatCurrencyJpy(Number(booking.pricing_meet_and_greet_jpy ?? 0)))
    );
  }
  if (Number(booking.pricing_child_seat_jpy ?? 0) > 0) {
    details.splice(
      14,
      0,
      renderRow("Child seat fee", formatCurrencyJpy(Number(booking.pricing_child_seat_jpy ?? 0)))
    );
  }

  if (usingTestSender && testRecipient) {
    details.splice(
      2,
      0,
      renderRow("Delivery mode", "Test delivery via resend.dev"),
      renderRow("Test recipient", testRecipient),
      renderRow("Original customer email", booking.contact_email)
    );
  }

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

  const introText = usingTestSender
    ? `This is a test delivery sent to ${escapeHtml(testRecipient ?? "")}. The original customer email is ${escapeHtml(booking.contact_email)}.`
    : "Your transfer has been recorded successfully. You can use the summary below as your booking confirmation.";

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
                ${introText}
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
    `${usingTestSender ? "[Test Delivery] " : ""}XioohTravel payment confirmation`,
    "",
    usingTestSender && testRecipient ? `Delivery mode: Test delivery via resend.dev` : null,
    usingTestSender && testRecipient ? `Test recipient: ${testRecipient}` : null,
    usingTestSender ? `Original customer email: ${booking.contact_email}` : null,
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
    `Meet-and-greet sign: ${booking.meet_and_greet_sign ? "Yes" : "No"}`,
    Number(booking.pricing_child_seat_jpy ?? 0) > 0
      ? `Child seat fee: ${formatCurrencyJpy(Number(booking.pricing_child_seat_jpy ?? 0))}`
      : null,
    Number(booking.pricing_meet_and_greet_jpy ?? 0) > 0
      ? `Meet-and-greet fee: ${formatCurrencyJpy(Number(booking.pricing_meet_and_greet_jpy ?? 0))}`
      : null,
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

  const emailPayload: ResendEmailPayload = {
    from,
    to: recipientEmail,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  };

  for (let attempt = 1; attempt <= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS; attempt += 1) {
    const response = await sendResendEmailRequest(emailPayload, idempotencyKey);

    if (!response.error) {
      console.info("[email] Resend accepted booking payment confirmation", {
        bookingId: booking.id,
        recipientEmail: maskEmailForLog(recipientEmail),
        providerId: response.data?.id ?? null,
        attempt,
      });

      return {
        providerId: response.data?.id ?? null,
      };
    }

    const retryable = shouldRetryResendError(response.error);
    console.error("[email] Resend rejected booking payment confirmation", {
      bookingId: booking.id,
      recipientEmail: maskEmailForLog(recipientEmail),
      originalCustomerEmail: maskEmailForLog(booking.contact_email),
      diagnostics,
      responseError: response.error,
      attempt,
      retryable,
    });

    if (!retryable || attempt >= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS) {
      throw new Error(response.error.message || "Failed to send payment confirmation email");
    }

    const delayMs = PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[attempt - 1] ?? PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS.length - 1] ?? 1000;
    console.warn("[email] Retrying booking payment confirmation", {
      bookingId: booking.id,
      attempt,
      nextAttempt: attempt + 1,
      delayMs,
    });
    await sleep(delayMs);
  }

  throw new Error("Failed to send payment confirmation email");
}

export async function sendBookingRefundConfirmationEmail(booking: RefundConfirmationBooking) {
  const diagnostics = getPaymentConfirmationEmailDiagnostics();
  const from = getBookingEmailFrom();
  const usingTestSender = isResendDevSender(from);
  const testRecipient = usingTestSender ? getBookingEmailTestTo() : null;

  if (usingTestSender && !testRecipient) {
    throw new Error("BOOKING_EMAIL_TEST_TO is required when using onboarding@resend.dev");
  }

  const recipientEmail = testRecipient ?? booking.contact_email;
  const idempotencyKey = buildRefundConfirmationIdempotencyKey(booking.id, booking.stripe_refund_id);
  console.info("[email] Sending booking refund confirmation", {
    bookingId: booking.id,
    from,
    usingTestSender,
    recipientEmail: maskEmailForLog(recipientEmail),
    originalCustomerEmail: maskEmailForLog(booking.contact_email),
    idempotencyKey,
    diagnostics,
  });

  const ordersUrl = getOrdersUrl(booking.contact_email);
  const originalPaidAmount = formatCurrencyJpy(Number(booking.pricing_total_jpy ?? 0));
  const feeDeductedJpy = Number(booking.refund_fee_deducted_jpy ?? booking.stripe_payment_fee_jpy ?? 0);
  const feeDeducted = formatCurrencyJpy(feeDeductedJpy);
  const refundAmount = formatCurrencyJpy(Number(booking.refund_amount_jpy ?? booking.pricing_total_jpy ?? 0));
  const pickupTime = formatDateTimeJST(booking.pickup_time, "en-US");
  const pickupLocation = getLocalizedLocation(booking.pickup_location, "en");
  const dropoffLocation = getLocalizedLocation(booking.dropoff_location, "en");
  const refundedAt = booking.refunded_at ? formatDateTimeJST(booking.refunded_at, "en-US") : "Refund processed";
  const subjectPrefix = usingTestSender ? "[Test Delivery] " : "";
  const subject = `${subjectPrefix}Refund processed - XioohTravel booking ${booking.id}`;
  const replyTo = getBookingEmailReplyTo();

  const details = [
    renderRow("Booking ID", booking.id),
    renderRow("Refund status", "Refund processed"),
    renderRow("Original paid amount", originalPaidAmount),
    renderRow("Stripe actual processing fee deducted", feeDeducted),
    renderRow("Refund amount", refundAmount),
    renderRow("Refunded at", refundedAt),
    renderRow("Pickup time (JST)", pickupTime),
    renderRow("Pickup", pickupLocation),
    renderRow("Drop-off", dropoffLocation),
    renderRow("Contact", booking.contact_name),
    renderRow("Email", booking.contact_email),
  ];

  if (booking.stripe_refund_id) {
    details.push(renderRow("Stripe refund", booking.stripe_refund_id));
  }

  if (usingTestSender && testRecipient) {
    details.splice(
      2,
      0,
      renderRow("Delivery mode", "Test delivery via resend.dev"),
      renderRow("Test recipient", testRecipient),
      renderRow("Original customer email", booking.contact_email)
    );
  }

  const introText = usingTestSender
    ? `This is a test delivery sent to ${escapeHtml(testRecipient ?? "")}. The original customer email is ${escapeHtml(booking.contact_email)}.`
    : "Your cancellation has been processed. The Stripe processing fee is non-refundable and has been deducted from the refund amount. Actual arrival time depends on the bank or card issuer.";

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <div style="padding:32px;background:linear-gradient(135deg,#0f172a 0%,#16a34a 100%);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">XioohTravel</div>
              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Refund processed</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.92;">
                ${introText}
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                ${details.join("")}
              </table>

              <div style="margin-top:28px;padding:20px;border-radius:18px;background:#ecfdf5;border:1px solid #bbf7d0;">
                <div style="font-size:16px;font-weight:700;color:#047857;margin-bottom:8px;">Refund timing</div>
                <div style="font-size:14px;line-height:1.7;color:#065f46;margin-bottom:14px;">
                  Stripe has accepted the refund request. Banks and card issuers may take additional time to show the funds on the card statement.
                </div>
                <a
                  href="${escapeHtml(ordersUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:999px;background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;"
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
    `${usingTestSender ? "[Test Delivery] " : ""}XioohTravel refund confirmation`,
    "",
    usingTestSender && testRecipient ? `Delivery mode: Test delivery via resend.dev` : null,
    usingTestSender && testRecipient ? `Test recipient: ${testRecipient}` : null,
    usingTestSender ? `Original customer email: ${booking.contact_email}` : null,
    `Booking ID: ${booking.id}`,
    "Refund status: Refund processed",
    `Original paid amount: ${originalPaidAmount}`,
    `Stripe actual processing fee deducted: ${feeDeducted}`,
    `Refund amount: ${refundAmount}`,
    `Refunded at: ${refundedAt}`,
    `Pickup time (JST): ${pickupTime}`,
    `Pickup: ${pickupLocation}`,
    `Drop-off: ${dropoffLocation}`,
    booking.stripe_refund_id ? `Stripe refund: ${booking.stripe_refund_id}` : null,
    "",
    "Actual arrival time depends on the bank or card issuer.",
    `View your orders: ${ordersUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const emailPayload: ResendEmailPayload = {
    from,
    to: recipientEmail,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  };

  for (let attempt = 1; attempt <= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS; attempt += 1) {
    const response = await sendResendEmailRequest(emailPayload, idempotencyKey);

    if (!response.error) {
      console.info("[email] Resend accepted booking refund confirmation", {
        bookingId: booking.id,
        recipientEmail: maskEmailForLog(recipientEmail),
        providerId: response.data?.id ?? null,
        attempt,
      });

      return {
        providerId: response.data?.id ?? null,
      };
    }

    const retryable = shouldRetryResendError(response.error);
    console.error("[email] Resend rejected booking refund confirmation", {
      bookingId: booking.id,
      recipientEmail: maskEmailForLog(recipientEmail),
      originalCustomerEmail: maskEmailForLog(booking.contact_email),
      diagnostics,
      responseError: response.error,
      attempt,
      retryable,
    });

    if (!retryable || attempt >= PAYMENT_CONFIRMATION_EMAIL_MAX_ATTEMPTS) {
      throw new Error(response.error.message || "Failed to send refund confirmation email");
    }

    const delayMs = PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[attempt - 1] ?? PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS[PAYMENT_CONFIRMATION_EMAIL_RETRY_DELAYS_MS.length - 1] ?? 1000;
    console.warn("[email] Retrying booking refund confirmation", {
      bookingId: booking.id,
      attempt,
      nextAttempt: attempt + 1,
      delayMs,
    });
    await sleep(delayMs);
  }

  throw new Error("Failed to send refund confirmation email");
}

export async function sendMerchantOrderNotificationEmail({
  booking,
  recipients,
}: {
  booking: PaymentConfirmationBooking;
  recipients: string[];
}) {
  if (recipients.length === 0) {
    return { providerId: null };
  }

  const diagnostics = getPaymentConfirmationEmailDiagnostics();
  const from = getBookingEmailFrom();
  const idempotencyKey = buildMerchantOrderNotificationIdempotencyKey(booking.id);
  const adminUrl = buildAdminUrl();
  const tripType = getTripTypeLabel(booking.trip_type);
  const vehicle = getVehicleLabel(booking.vehicle_name);
  const pickupTime = formatDateTimeJST(booking.pickup_time, "en-US");
  const pickupLocation = getLocalizedLocation(booking.pickup_location, "en");
  const dropoffLocation = getLocalizedLocation(booking.dropoff_location, "en");
  const luggage = buildLuggageSummary(booking);
  const totalPaid = formatCurrencyJpy(Number(booking.pricing_total_jpy ?? 0));
  const urgency = booking.is_urgent ? "Urgent order within 24h" : "Non-urgent order";
  const subject = `[Merchant] New paid booking ${booking.id} - ${pickupLocation} to ${dropoffLocation}`;
  const replyTo = getBookingEmailReplyTo();

  console.info("[email] Sending merchant order notification", {
    bookingId: booking.id,
    recipientCount: recipients.length,
    idempotencyKey,
    diagnostics,
  });

  const details = [
    renderRow("Booking ID", booking.id),
    renderRow("Order type", urgency),
    renderRow("Status", booking.status),
    renderRow("Trip type", tripType),
    renderRow("Vehicle", vehicle),
    renderRow("Pickup time (JST)", pickupTime),
    renderRow("Pickup", pickupLocation),
    renderRow("Drop-off", dropoffLocation),
    renderRow("Flight number", booking.flight_number ?? "-"),
    renderRow("Flight note", booking.flight_note ?? "-"),
    renderRow("Passengers", String(booking.passengers)),
    renderRow("Child seats", String(booking.child_seats)),
    renderRow("Meet-and-greet sign", booking.meet_and_greet_sign ? "Yes" : "No"),
    renderRow("Luggage", luggage),
    renderRow("Contact name", booking.contact_name),
    renderRow("Contact phone", booking.contact_phone),
    renderRow("Contact email", booking.contact_email),
    renderRow("Special request", booking.contact_note ?? "-"),
    renderRow("Total paid", totalPaid),
    renderRow("Stripe payment", booking.stripe_payment_intent_id ?? "-"),
  ];

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:720px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <div style="padding:32px;background:linear-gradient(135deg,#111827 0%,#0ea5e9 100%);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">XioohTravel merchant notice</div>
              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">New paid booking</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.92;">
                A customer has completed payment. Please arrange the vehicle and driver according to the details below.
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                ${details.join("")}
              </table>

              <div style="margin-top:28px;padding:20px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;">
                <div style="font-size:16px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">Admin dashboard</div>
                <div style="font-size:14px;line-height:1.7;color:#1e3a8a;margin-bottom:14px;">
                  Open the admin dashboard to review this booking and manage operational status.
                </div>
                <a
                  href="${escapeHtml(adminUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:999px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;"
                >
                  Open admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "XioohTravel merchant notice",
    "",
    "New paid booking",
    `Booking ID: ${booking.id}`,
    `Order type: ${urgency}`,
    `Status: ${booking.status}`,
    `Trip type: ${tripType}`,
    `Vehicle: ${vehicle}`,
    `Pickup time (JST): ${pickupTime}`,
    `Pickup: ${pickupLocation}`,
    `Drop-off: ${dropoffLocation}`,
    `Flight number: ${booking.flight_number ?? "-"}`,
    `Flight note: ${booking.flight_note ?? "-"}`,
    `Passengers: ${booking.passengers}`,
    `Child seats: ${booking.child_seats}`,
    `Meet-and-greet sign: ${booking.meet_and_greet_sign ? "Yes" : "No"}`,
    `Luggage: ${luggage}`,
    `Contact name: ${booking.contact_name}`,
    `Contact phone: ${booking.contact_phone}`,
    `Contact email: ${booking.contact_email}`,
    `Special request: ${booking.contact_note ?? "-"}`,
    `Total paid: ${totalPaid}`,
    `Stripe payment: ${booking.stripe_payment_intent_id ?? "-"}`,
    "",
    `Admin dashboard: ${adminUrl}`,
  ].join("\n");

  const response = await sendResendEmailRequest(
    {
      from,
      to: recipients,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    },
    idempotencyKey
  );

  if (response.error) {
    throw new Error(response.error.message || "Failed to send merchant order notification");
  }

  return {
    providerId: response.data?.id ?? null,
  };
}

export async function sendMerchantRefundNotificationEmail({
  booking,
  recipients,
}: {
  booking: RefundConfirmationBooking & {
    cancel_reason: string | null;
    cancelled_at: Date | string | null;
  };
  recipients: string[];
}) {
  if (recipients.length === 0) {
    return { providerId: null };
  }

  const diagnostics = getPaymentConfirmationEmailDiagnostics();
  const from = getBookingEmailFrom();
  const idempotencyKey = buildMerchantRefundNotificationIdempotencyKey(booking.id, booking.stripe_refund_id);
  const adminUrl = buildAdminUrl();
  const pickupTime = formatDateTimeJST(booking.pickup_time, "en-US");
  const pickupLocation = getLocalizedLocation(booking.pickup_location, "en");
  const dropoffLocation = getLocalizedLocation(booking.dropoff_location, "en");
  const originalPaidAmount = formatCurrencyJpy(Number(booking.pricing_total_jpy ?? 0));
  const feeDeductedJpy = Number(booking.refund_fee_deducted_jpy ?? booking.stripe_payment_fee_jpy ?? 0);
  const feeDeducted = formatCurrencyJpy(feeDeductedJpy);
  const refundAmount = formatCurrencyJpy(Number(booking.refund_amount_jpy ?? booking.pricing_total_jpy ?? 0));
  const cancelledAt = booking.cancelled_at ? formatDateTimeJST(booking.cancelled_at, "en-US") : "Cancelled";
  const subject = `[Merchant] Booking cancelled ${booking.id} - refund ${booking.stripe_refund_status ?? "requested"}`;
  const replyTo = getBookingEmailReplyTo();

  console.info("[email] Sending merchant refund notification", {
    bookingId: booking.id,
    recipientCount: recipients.length,
    idempotencyKey,
    diagnostics,
  });

  const details = [
    renderRow("Booking ID", booking.id),
    renderRow("Status", booking.status),
    renderRow("Cancelled at", cancelledAt),
    renderRow("Cancellation reason", booking.cancel_reason ?? "-"),
    renderRow("Refund status", booking.stripe_refund_status ?? "-"),
    renderRow("Original paid amount", originalPaidAmount),
    renderRow("Stripe actual processing fee deducted", feeDeducted),
    renderRow("Refund amount", refundAmount),
    renderRow("Stripe refund", booking.stripe_refund_id ?? "-"),
    renderRow("Pickup time (JST)", pickupTime),
    renderRow("Pickup", pickupLocation),
    renderRow("Drop-off", dropoffLocation),
    renderRow("Contact name", booking.contact_name),
    renderRow("Contact phone", booking.contact_phone),
    renderRow("Contact email", booking.contact_email),
  ];

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:720px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <div style="padding:32px;background:linear-gradient(135deg,#111827 0%,#dc2626 100%);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">XioohTravel merchant notice</div>
              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Booking cancelled</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.92;">
                A paid booking was cancelled and a Stripe refund request was created. Please stop or adjust vehicle arrangements.
              </p>
            </div>

            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                ${details.join("")}
              </table>

              <div style="margin-top:28px;padding:20px;border-radius:18px;background:#fef2f2;border:1px solid #fecaca;">
                <div style="font-size:16px;font-weight:700;color:#b91c1c;margin-bottom:8px;">Action needed</div>
                <div style="font-size:14px;line-height:1.7;color:#7f1d1d;margin-bottom:14px;">
                  Please review driver and vehicle arrangements for this booking.
                </div>
                <a
                  href="${escapeHtml(adminUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:999px;background:#dc2626;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;"
                >
                  Open admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "XioohTravel merchant notice",
    "",
    "Booking cancelled",
    `Booking ID: ${booking.id}`,
    `Status: ${booking.status}`,
    `Cancelled at: ${cancelledAt}`,
    `Cancellation reason: ${booking.cancel_reason ?? "-"}`,
    `Refund status: ${booking.stripe_refund_status ?? "-"}`,
    `Original paid amount: ${originalPaidAmount}`,
    `Stripe actual processing fee deducted: ${feeDeducted}`,
    `Refund amount: ${refundAmount}`,
    `Stripe refund: ${booking.stripe_refund_id ?? "-"}`,
    `Pickup time (JST): ${pickupTime}`,
    `Pickup: ${pickupLocation}`,
    `Drop-off: ${dropoffLocation}`,
    `Contact name: ${booking.contact_name}`,
    `Contact phone: ${booking.contact_phone}`,
    `Contact email: ${booking.contact_email}`,
    "",
    `Admin dashboard: ${adminUrl}`,
  ].join("\n");

  const response = await sendResendEmailRequest(
    {
      from,
      to: recipients,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    },
    idempotencyKey
  );

  if (response.error) {
    throw new Error(response.error.message || "Failed to send merchant refund notification");
  }

  return {
    providerId: response.data?.id ?? null,
  };
}
