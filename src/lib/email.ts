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
  pricing_meet_and_greet_jpy: number;
  pricing_total_jpy: number;
  stripe_payment_intent_id: string | null;
  paid_at: Date | string | null;
  vehicle_name: string | null;
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

type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

async function sendResendEmailRequest(payload: ResendEmailPayload, idempotencyKey: string) {
  const apiKey = getResendApiKey();
  const requestBody = JSON.stringify({
    from: payload.from,
    to: [payload.to],
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
