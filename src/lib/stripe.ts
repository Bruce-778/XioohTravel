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
  baseJpy: number;
  nightJpy: number;
  urgentJpy: number;
  childSeats: number;
  childSeatTotalJpy: number;
  meetAndGreetSign: boolean;
  meetAndGreetTotalJpy: number;
  manualAdjustmentJpy?: number;
  totalJpy: number;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: Date;
  req?: Request;
};

type CheckoutSessionParams = NonNullable<Parameters<Stripe["checkout"]["sessions"]["create"]>[0]>;
type CheckoutLineItem = NonNullable<CheckoutSessionParams["line_items"]>[number];

type PricingComponent = {
  name: string;
  amountJpy: number;
  description?: string;
};

function buildCheckoutPricingComponents(input: CreateCheckoutSessionInput) {
  const pickupDate = input.pickupTime.toISOString().slice(0, 16).replace("T", " ");
  const routeLabel = `${input.pickupLocation} -> ${input.dropoffLocation}`;
  const components: PricingComponent[] = [
    {
      name: "Airport transfer base fare",
      amountJpy: input.baseJpy,
      description: `${routeLabel} | ${pickupDate} JST`,
    },
  ];

  if (input.nightJpy > 0) {
    components.push({ name: "Night service surcharge", amountJpy: input.nightJpy });
  }
  if (input.urgentJpy > 0) {
    components.push({ name: "Urgent booking surcharge", amountJpy: input.urgentJpy });
  }
  if (input.childSeatTotalJpy > 0) {
    components.push({
      name: "Child seat service",
      amountJpy: input.childSeatTotalJpy,
      ...(input.childSeats > 0
        ? {
            description: `${input.childSeats} seat${input.childSeats === 1 ? "" : "s"}`,
          }
        : {}),
    });
  }
  if (input.meetAndGreetTotalJpy > 0) {
    components.push({
      name: "Meet-and-greet sign service",
      amountJpy: input.meetAndGreetTotalJpy,
      description: "Airport arrival placard service",
    });
  }

  const manualAdjustmentJpy = Number(input.manualAdjustmentJpy ?? 0);
  if (manualAdjustmentJpy > 0) {
    components.push({
      name: "Manual price adjustment",
      amountJpy: manualAdjustmentJpy,
    });
  } else if (manualAdjustmentJpy < 0) {
    let remainingDiscount = Math.abs(manualAdjustmentJpy);

    for (const component of components) {
      if (remainingDiscount <= 0) break;
      const deduction = Math.min(component.amountJpy, remainingDiscount);
      component.amountJpy -= deduction;
      remainingDiscount -= deduction;
    }

    if (remainingDiscount > 0) {
      throw new Error("Manual adjustment exceeds booking total");
    }
  }

  return components.filter((component) => component.amountJpy > 0);
}

function buildCheckoutLineItems(input: CreateCheckoutSessionInput): CheckoutLineItem[] {
  return buildCheckoutPricingComponents(input).map((component) => ({
    quantity: 1,
    price_data: {
      currency: "jpy",
      unit_amount: component.amountJpy,
      product_data: {
        name: component.name,
        ...(component.description ? { description: component.description } : {}),
      },
    },
  }));
}

export async function createBookingCheckoutSession(input: CreateCheckoutSessionInput) {
  const lineItems = buildCheckoutLineItems(input);
  const computedTotal = lineItems.reduce((sum, item) => {
    const unitAmount = item.price_data?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    return sum + unitAmount * quantity;
  }, 0);

  if (computedTotal <= 0 || input.totalJpy <= 0) {
    throw new Error("Booking total must be greater than zero");
  }
  if (computedTotal !== input.totalJpy) {
    throw new Error("Checkout line items do not match booking total");
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
    line_items: lineItems,
    metadata: {
      bookingId: input.bookingId,
      contactEmail: input.contactEmail,
    },
    payment_intent_data: {
      description: `XioohTravel booking ${input.bookingId} | ${routeLabel} | ${pickupDate} JST`,
      metadata: {
        bookingId: input.bookingId,
        contactEmail: input.contactEmail,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
      },
    },
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}
