import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeNightFee, isUrgentOrder, CHILD_SEAT_FEE_JPY } from "@/lib/bookingRules";
import { getPricingAreaCode } from "@/lib/locationData";
import { CreateBookingSchema } from "@/lib/validators";

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

type VehicleRow = {
  id: string;
  seats: number;
  luggage_small: number;
  luggage_medium: number;
  luggage_large: number;
};

type PricingRuleRow = {
  base_price_jpy: number;
  night_fee_jpy: number;
  urgent_fee_jpy: number;
};

type BookingRow = {
  id: string;
  status: string;
  contact_email: string;
  pickup_time: Date;
  pickup_location: string;
  dropoff_location: string;
  pricing_total_jpy: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  vehicle_name?: string;
};

const MAX_BOOKING_ID_RETRIES = 5;

function generateBookingId() {
  let suffix = "";

  for (let index = 0; index < 10; index += 1) {
    suffix += String(randomInt(10));
  }

  return `XT${suffix}`;
}

function getStripePaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

export async function calculateBookingSnapshot(data: CreateBookingInput) {
  const pickupTime = new Date(data.pickupTime);
  const now = new Date();
  const isUrgent = isUrgentOrder(now, pickupTime);
  const isNight = computeNightFee(pickupTime);

  const vehicleResult = await db.query(
    "SELECT id, seats, luggage_small, luggage_medium, luggage_large FROM vehicle_types WHERE id = $1",
    [data.vehicleTypeId]
  );
  const vehicles = vehicleResult.rows as VehicleRow[];
  if (vehicles.length === 0) {
    throw new BookingError("Vehicle not found", "api.orderNotFound", 404);
  }
  const vehicle = vehicles[0];

  const fromCode = getPricingAreaCode(data.fromArea);
  const toCode = getPricingAreaCode(data.toArea);

  const pricingRuleResult = await db.query(
    `SELECT base_price_jpy, night_fee_jpy, urgent_fee_jpy
     FROM pricing_rules
     WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4
     LIMIT 1`,
    [fromCode, toCode, data.tripType, data.vehicleTypeId]
  );
  const rules = pricingRuleResult.rows as PricingRuleRow[];

  if (rules.length === 0) {
    throw new BookingError("Price not found", "checkout.noPrice", 404);
  }

  if (data.passengers > vehicle.seats) {
    throw new BookingError("Passengers exceed seats", "api.passengersExceeded", 400);
  }

  if (
    data.luggageSmall > vehicle.luggage_small ||
    data.luggageMedium > vehicle.luggage_medium ||
    data.luggageLarge > vehicle.luggage_large
  ) {
    throw new BookingError("Luggage exceeds capacity", "api.luggageExceeded", 400);
  }

  const rule = rules[0];
  const base = Number(rule.base_price_jpy ?? 0);
  const night = isNight ? Number(rule.night_fee_jpy ?? 0) : 0;
  const urgent = isUrgent ? Number(rule.urgent_fee_jpy ?? 0) : 0;
  const childSeat = (data.childSeats || 0) * CHILD_SEAT_FEE_JPY;
  const total = base + night + urgent + childSeat;

  return {
    pickupTime,
    isUrgent,
    base,
    night,
    urgent,
    childSeat,
    total,
  };
}

export async function createPendingBooking(data: CreateBookingInput) {
  const snapshot = await calculateBookingSnapshot(data);
  let bookingId = "";

  for (let attempt = 0; attempt < MAX_BOOKING_ID_RETRIES; attempt += 1) {
    bookingId = generateBookingId();

    try {
      await db.query(
        `INSERT INTO bookings (
          id, status, trip_type, pickup_time, pickup_location, dropoff_location,
          flight_number, flight_note, passengers, child_seats,
          luggage_small, luggage_medium, luggage_large,
          contact_name, contact_phone, contact_email, contact_note,
          vehicle_type_id, is_urgent, pricing_base_jpy, pricing_night_jpy,
          pricing_urgent_jpy, pricing_child_seat_jpy, pricing_total_jpy,
          stripe_payment_status
        ) VALUES (
          $1, 'PENDING_PAYMENT', $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23,
          'unpaid'
        )`,
        [
          bookingId,
          data.tripType,
          snapshot.pickupTime,
          data.pickupLocation,
          data.dropoffLocation,
          data.flightNumber,
          data.flightNote,
          data.passengers,
          data.childSeats,
          data.luggageSmall,
          data.luggageMedium,
          data.luggageLarge,
          data.contactName,
          data.contactPhone,
          data.contactEmail,
          data.contactNote,
          data.vehicleTypeId,
          snapshot.isUrgent,
          snapshot.base,
          snapshot.night,
          snapshot.urgent,
          snapshot.childSeat,
          snapshot.total,
        ]
      );
      break;
    } catch (error: any) {
      if (error?.code === "23505" && attempt < MAX_BOOKING_ID_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  if (!bookingId) {
    throw new Error("Failed to generate booking id");
  }

  return {
    bookingId,
    snapshot,
  };
}

export async function deleteBookingIfPending(bookingId: string) {
  await db.query("DELETE FROM bookings WHERE id = $1 AND status = 'PENDING_PAYMENT'", [bookingId]);
}

export async function linkBookingEmailToUser(userId: string | undefined, contactEmail: string) {
  if (!userId) return;

  const { rows: linked } = await db.query(
    "SELECT 1 FROM user_emails WHERE user_id = $1 AND email = $2",
    [userId, contactEmail]
  );

  if (linked.length > 0) {
    return;
  }

  await db.query("INSERT INTO user_emails (user_id, email) VALUES ($1, $2)", [userId, contactEmail]);
}

export async function getUserAccessibleEmails(userId: string, primaryEmail?: string) {
  const emails = new Set<string>();
  if (primaryEmail) {
    emails.add(primaryEmail);
  }

  const result = await db.query(
    "SELECT email FROM user_emails WHERE user_id = $1",
    [userId]
  );
  const rows = result.rows as Array<{ email: string }>;

  for (const row of rows) {
    emails.add(row.email);
  }

  return [...emails];
}

export async function getBookingById(bookingId: string) {
  const result = await db.query(
    `SELECT b.*, v.name AS vehicle_name
     FROM bookings b
     LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
     WHERE b.id = $1
     LIMIT 1`,
    [bookingId]
  );
  const rows = result.rows as Array<BookingRow & { vehicle_name: string | null }>;

  return rows[0] ?? null;
}

export function getBookingIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.bookingId ?? null;
}

export async function attachCheckoutSessionToBooking(bookingId: string, session: Stripe.Checkout.Session) {
  await db.query(
    `UPDATE bookings
     SET stripe_checkout_session_id = $2,
         stripe_payment_status = COALESCE($3, stripe_payment_status),
         updated_at = NOW()
     WHERE id = $1`,
    [bookingId, session.id, session.payment_status ?? null]
  );
}

export async function syncBookingPaymentFromCheckoutSession(session: Stripe.Checkout.Session) {
  const bookingId = getBookingIdFromCheckoutSession(session);
  if (!bookingId) {
    throw new Error("Checkout session does not reference a booking");
  }

  const paymentStatus = session.payment_status ?? null;
  const paymentIntentId = getStripePaymentIntentId(session);
  const paidAt = paymentStatus === "paid"
    ? new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000)
    : null;

  await db.query(
    `UPDATE bookings
     SET stripe_checkout_session_id = COALESCE($2, stripe_checkout_session_id),
         stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
         stripe_payment_status = COALESCE($4, stripe_payment_status),
         paid_at = CASE
           WHEN $5::timestamptz IS NOT NULL THEN COALESCE(paid_at, $5)
           ELSE paid_at
         END,
         status = CASE
           WHEN $4 = 'paid' AND status = 'PENDING_PAYMENT' THEN 'PAID'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $1`,
    [bookingId, session.id, paymentIntentId, paymentStatus, paidAt]
  );

  return bookingId;
}
