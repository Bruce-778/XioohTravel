import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getAppBaseUrl(req?: Request) {
  if (process.env.APP_BASE_URL) {
    return trimTrailingSlash(process.env.APP_BASE_URL);
  }

  if (req) {
    return trimTrailingSlash(new URL(req.url).origin);
  }

  throw new Error("APP_BASE_URL is not configured");
}

type CreateCheckoutSessionInput = {
  bookingId: string;
  contactEmail: string;
  totalJpy: number;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: Date;
  req?: Request;
};

export async function createBookingCheckoutSession(input: CreateCheckoutSessionInput) {
  if (input.totalJpy <= 0) {
    throw new Error("Booking total must be greater than zero");
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl(input.req);
  const pickupDate = input.pickupTime.toISOString().slice(0, 16).replace("T", " ");
  const routeLabel = `${input.pickupLocation} -> ${input.dropoffLocation}`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.bookingId,
    customer_email: input.contactEmail,
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/orders?email=${encodeURIComponent(input.contactEmail)}&bookingId=${encodeURIComponent(input.bookingId)}&payment=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: input.totalJpy,
          product_data: {
            name: "TripGo Airport Transfer",
            description: `${routeLabel} | ${pickupDate} JST`,
          },
        },
      },
    ],
    metadata: {
      bookingId: input.bookingId,
      contactEmail: input.contactEmail,
    },
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}
