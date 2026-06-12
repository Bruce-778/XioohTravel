import Stripe from "stripe";
import { HttpsProxyAgent } from "https-proxy-agent";
import { formatJstDateTimeLocalValue } from "@/lib/timeFormat";

let stripeClient: Stripe | null = null;

// Stripe requires at least 30 minutes; keep a buffer for clock skew and network latency.
export const STRIPE_CHECKOUT_SESSION_EXPIRES_IN_SECONDS = 35 * 60;
const STRIPE_API_TIMEOUT_MS = 10_000;
const STRIPE_API_MAX_NETWORK_RETRIES = 1;
const STRIPE_CHECKOUT_CREATE_TIMEOUT_MS = 20_000;

export class StripeCheckoutTimeoutError extends Error {
  constructor() {
    super("STRIPE_CHECKOUT_TIMEOUT");
    this.name = "StripeCheckoutTimeoutError";
  }
}

export function isStripeCheckoutUnavailableError(error: unknown) {
  if (error instanceof StripeCheckoutTimeoutError) return true;
  if (!error || typeof error !== "object") return false;

  const stripeError = error as { type?: string; code?: string; message?: string };
  return (
    stripeError.type === "StripeConnectionError" ||
    stripeError.code === "ETIMEDOUT" ||
    stripeError.code === "ECONNRESET" ||
    stripeError.message === "STRIPE_CHECKOUT_TIMEOUT"
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getRequestOrigin(req?: Request) {
  if (!req) return null;
  return trimTrailingSlash(new URL(req.url).origin);
}

function getStripeProxyUrl() {
  return process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? null;
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    const stripeConfig: ConstructorParameters<typeof Stripe>[1] = {
      maxNetworkRetries: STRIPE_API_MAX_NETWORK_RETRIES,
      timeout: STRIPE_API_TIMEOUT_MS,
    };
    const proxyUrl = getStripeProxyUrl();

    if (proxyUrl) {
      stripeConfig.httpAgent = new HttpsProxyAgent(proxyUrl);
    }

    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, stripeConfig);
  }

  return stripeClient;
}

export function getAppBaseUrl(req?: Request) {
  const requestOrigin = getRequestOrigin(req);

  if (requestOrigin && process.env.NODE_ENV === "development") {
    return requestOrigin;
  }

  if (process.env.APP_BASE_URL) {
    return trimTrailingSlash(process.env.APP_BASE_URL);
  }

  if (requestOrigin) {
    return requestOrigin;
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
  cancelUrl?: string;
  req?: Request;
};

type CheckoutSessionParams = NonNullable<Parameters<Stripe["checkout"]["sessions"]["create"]>[0]>;
type CheckoutLineItem = NonNullable<CheckoutSessionParams["line_items"]>[number];

type PricingComponent = {
  name: string;
  amountJpy: number;
  description?: string;
};

const STRIPE_PAYMENT_FEE_LOOKUP_ATTEMPTS = 5;
const STRIPE_PAYMENT_FEE_LOOKUP_DELAY_MS = 800;

export type StripePaymentFeeBreakdown = {
  paymentIntentId: string;
  chargeId: string;
  balanceTransactionId: string;
  feeJpy: number;
  amountJpy: number;
  chargeCurrency: string;
  balanceTransactionCurrency: string;
  balanceTransactionFee: number;
  exchangeRate: number | null;
  livemode: boolean;
};

export type StripePaymentFeeLookupFailureReason =
  | "payment_intent_missing_charge"
  | "charge_not_succeeded"
  | "charge_missing_balance_transaction"
  | "charge_currency_not_jpy"
  | "exchange_rate_missing"
  | "fee_missing"
  | "stripe_lookup_error";

export type StripePaymentFeeLookupFailure = {
  paymentIntentId: string;
  reason: StripePaymentFeeLookupFailureReason;
  chargeId?: string;
  chargeStatus?: string | null;
  balanceTransactionId?: string;
  currency?: string | null;
  chargeCurrency?: string | null;
  exchangeRate?: number | null;
  livemode?: boolean;
  message?: string;
};

export type StripePaymentFeeLookupResult =
  | { ok: true; breakdown: StripePaymentFeeBreakdown }
  | { ok: false; failure: StripePaymentFeeLookupFailure };

type StripePaymentFeeLookupFailureResult = Extract<StripePaymentFeeLookupResult, { ok: false }>;

function isStripeCharge(value: unknown): value is Stripe.Charge {
  return Boolean(value && typeof value === "object" && (value as { object?: string }).object === "charge");
}

function isStripeBalanceTransaction(value: unknown): value is Stripe.BalanceTransaction {
  return Boolean(value && typeof value === "object" && (value as { object?: string }).object === "balance_transaction");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStripePaymentFeeBreakdown(
  paymentIntentId: string,
  charge: Stripe.Charge,
  balanceTransaction: Stripe.BalanceTransaction | null
): StripePaymentFeeLookupResult {
  if (!balanceTransaction) {
    return {
      ok: false,
      failure: {
        paymentIntentId,
        reason: "charge_missing_balance_transaction",
        chargeId: charge.id,
        chargeStatus: charge.status,
        livemode: charge.livemode,
      },
    };
  }

  const chargeCurrency = charge.currency.toLowerCase();
  const balanceTransactionCurrency = balanceTransaction.currency.toLowerCase();
  const exchangeRate = balanceTransaction.exchange_rate == null ? null : Number(balanceTransaction.exchange_rate);
  if (chargeCurrency !== "jpy") {
    return {
      ok: false,
      failure: {
        paymentIntentId,
        reason: "charge_currency_not_jpy",
        chargeId: charge.id,
        chargeStatus: charge.status,
        balanceTransactionId: balanceTransaction.id,
        currency: balanceTransactionCurrency,
        chargeCurrency,
        exchangeRate,
        livemode: charge.livemode,
      },
    };
  }

  const balanceTransactionFee = Number(balanceTransaction.fee);
  const balanceTransactionAmount = Number(balanceTransaction.amount);
  if (
    !Number.isInteger(balanceTransactionFee) ||
    balanceTransactionFee < 0 ||
    !Number.isInteger(balanceTransactionAmount) ||
    balanceTransactionAmount <= 0
  ) {
    return {
      ok: false,
      failure: {
        paymentIntentId,
        reason: "fee_missing",
        chargeId: charge.id,
        chargeStatus: charge.status,
        balanceTransactionId: balanceTransaction.id,
        currency: balanceTransactionCurrency,
        chargeCurrency,
        exchangeRate,
        livemode: charge.livemode,
      },
    };
  }

  let feeJpy = balanceTransactionFee;
  if (balanceTransactionCurrency !== "jpy") {
    if (!Number.isFinite(exchangeRate) || exchangeRate === null || exchangeRate <= 0) {
      return {
        ok: false,
        failure: {
          paymentIntentId,
          reason: "exchange_rate_missing",
          chargeId: charge.id,
          chargeStatus: charge.status,
          balanceTransactionId: balanceTransaction.id,
          currency: balanceTransactionCurrency,
          chargeCurrency,
          exchangeRate,
          livemode: charge.livemode,
        },
      };
    }

    feeJpy = Math.ceil(balanceTransactionFee / exchangeRate);
  }

  const amountJpy = Number(charge.amount);
  if (!Number.isInteger(feeJpy) || feeJpy < 0 || !Number.isInteger(amountJpy) || amountJpy <= 0) {
    return {
      ok: false,
      failure: {
        paymentIntentId,
        reason: "fee_missing",
        chargeId: charge.id,
        chargeStatus: charge.status,
        balanceTransactionId: balanceTransaction.id,
        currency: balanceTransactionCurrency,
        chargeCurrency,
        exchangeRate,
        livemode: charge.livemode,
      },
    };
  }

  return {
    ok: true,
    breakdown: {
      paymentIntentId,
      chargeId: charge.id,
      balanceTransactionId: balanceTransaction.id,
      feeJpy,
      amountJpy,
      chargeCurrency,
      balanceTransactionCurrency,
      balanceTransactionFee,
      exchangeRate,
      livemode: charge.livemode,
    },
  };
}

function formatPickupTimeJstLabel(pickupTime: Date) {
  return formatJstDateTimeLocalValue(pickupTime).replace("T", " ");
}

function buildCheckoutPricingComponents(input: CreateCheckoutSessionInput) {
  const pickupDate = formatPickupTimeJstLabel(input.pickupTime);
  const routeLabel = `${input.pickupLocation} -> ${input.dropoffLocation}`;
  const fareJpy =
    Number(input.baseJpy ?? 0) +
    Number(input.urgentJpy ?? 0) +
    Number(input.nightJpy ?? 0);
  const components: PricingComponent[] = [
    {
      name: "Airport transfer fare",
      amountJpy: fareJpy,
      description: `${routeLabel} | ${pickupDate} JST`,
    },
  ];

  if (input.childSeatTotalJpy > 0) {
    components.push({
      name: "Child seat service",
      amountJpy: input.childSeatTotalJpy,
      description: `${input.childSeats} ${input.childSeats === 1 ? "seat" : "seats"}`,
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

export async function createBookingCheckoutSession(
  input: CreateCheckoutSessionInput,
  options?: { idempotencyKey?: string }
) {
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
  const pickupDate = formatPickupTimeJstLabel(input.pickupTime);
  const routeLabel = `${input.pickupLocation} -> ${input.dropoffLocation}`;

  return withTimeout(
    stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.bookingId,
        customer_email: input.contactEmail,
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          input.cancelUrl ??
          `${baseUrl}/orders?bookingId=${encodeURIComponent(input.bookingId)}&payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + STRIPE_CHECKOUT_SESSION_EXPIRES_IN_SECONDS,
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
      },
      options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined
    ),
    STRIPE_CHECKOUT_CREATE_TIMEOUT_MS,
    new StripeCheckoutTimeoutError()
  );
}

export type ExpireCheckoutSessionResult = "expired" | "already_completed" | "not_expirable";

/**
 * Expires an open Checkout Session so it can no longer be paid (e.g. after the
 * booking is cancelled or before issuing a fresh payment link). Returns
 * "already_completed" when the customer managed to pay before we expired it,
 * so callers can handle the payment race instead of silently ignoring it.
 */
export async function expireCheckoutSessionSafely(sessionId: string): Promise<ExpireCheckoutSessionResult> {
  const stripe = getStripe();
  try {
    await stripe.checkout.sessions.expire(sessionId);
    return "expired";
  } catch {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session.status === "complete" ? "already_completed" : "not_expirable";
    } catch {
      return "not_expirable";
    }
  }
}

/**
 * Full refund used as an automatic safety net (duplicate payment, or payment
 * that landed on an already-cancelled booking).
 */
export async function createSafetyRefund({
  paymentIntentId,
  idempotencyKey,
  metadata,
}: {
  paymentIntentId: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}) {
  return getStripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(metadata ? { metadata } : {}),
    },
    { idempotencyKey }
  );
}

export async function retrieveCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export async function retrieveCheckoutSessionWithPaymentIntent(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
}

function buildStripePaymentFeeFailure(
  paymentIntentId: string,
  reason: StripePaymentFeeLookupFailureReason,
  data?: Omit<StripePaymentFeeLookupFailure, "paymentIntentId" | "reason">
): StripePaymentFeeLookupFailureResult {
  return {
    ok: false,
    failure: {
      paymentIntentId,
      reason,
      ...data,
    },
  };
}

async function findChargeForPaymentIntent(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
  paymentIntentId: string
): Promise<StripePaymentFeeLookupFailureResult | { ok: true; charge: Stripe.Charge }> {
  let charge: Stripe.Charge | null = isStripeCharge(paymentIntent.latest_charge)
    ? paymentIntent.latest_charge
    : null;

  if (!charge && typeof paymentIntent.latest_charge === "string") {
    charge = await stripe.charges.retrieve(paymentIntent.latest_charge, {
      expand: ["balance_transaction"],
    });
  }

  if (!charge) {
    const listedCharges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 10,
    });
    charge = listedCharges.data.find((candidate) => candidate.status === "succeeded") ?? listedCharges.data[0] ?? null;
  }

  if (!charge) {
    return buildStripePaymentFeeFailure(paymentIntentId, "payment_intent_missing_charge");
  }

  if (charge.status !== "succeeded") {
    return buildStripePaymentFeeFailure(paymentIntentId, "charge_not_succeeded", {
      chargeId: charge.id,
      chargeStatus: charge.status,
      livemode: charge.livemode,
    });
  }

  return { ok: true, charge };
}

async function findBalanceTransactionForCharge(
  stripe: Stripe,
  paymentIntentId: string,
  charge: Stripe.Charge
): Promise<StripePaymentFeeLookupFailureResult | { ok: true; balanceTransaction: Stripe.BalanceTransaction }> {
  let balanceTransaction: Stripe.BalanceTransaction | null = isStripeBalanceTransaction(charge.balance_transaction)
    ? charge.balance_transaction
    : null;

  if (!balanceTransaction && typeof charge.balance_transaction === "string") {
    balanceTransaction = await stripe.balanceTransactions.retrieve(charge.balance_transaction);
  }

  if (!balanceTransaction) {
    const listedBalanceTransactions = await stripe.balanceTransactions.list({
      source: charge.id,
      limit: 1,
    });
    balanceTransaction = listedBalanceTransactions.data[0] ?? null;
  }

  if (!balanceTransaction) {
    return buildStripePaymentFeeFailure(paymentIntentId, "charge_missing_balance_transaction", {
      chargeId: charge.id,
      chargeStatus: charge.status,
      livemode: charge.livemode,
    });
  }

  return { ok: true, balanceTransaction };
}

async function getStripePaymentFeeLookupResultOnce(paymentIntentId: string): Promise<StripePaymentFeeLookupResult> {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.balance_transaction"],
  });

  const chargeResult = await findChargeForPaymentIntent(stripe, paymentIntent, paymentIntentId);
  if (!chargeResult.ok) {
    return chargeResult;
  }

  const balanceTransactionResult = await findBalanceTransactionForCharge(stripe, paymentIntentId, chargeResult.charge);
  if (!balanceTransactionResult.ok) {
    return balanceTransactionResult;
  }

  return buildStripePaymentFeeBreakdown(paymentIntentId, chargeResult.charge, balanceTransactionResult.balanceTransaction);
}

export async function getStripePaymentFeeLookupResult(paymentIntentId: string): Promise<StripePaymentFeeLookupResult> {
  let lastFailure: StripePaymentFeeLookupFailure | null = null;

  for (let attempt = 1; attempt <= STRIPE_PAYMENT_FEE_LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      const lookupResult = await getStripePaymentFeeLookupResultOnce(paymentIntentId);
      if (lookupResult.ok) {
        return lookupResult;
      }
      lastFailure = lookupResult.failure;
    } catch (error: any) {
      if (error?.message === "STRIPE_SECRET_KEY is not configured") {
        throw error;
      }
      lastFailure = {
        paymentIntentId,
        reason: "stripe_lookup_error",
        message: error?.message ?? "Stripe fee lookup failed",
      };
    }

    if (attempt < STRIPE_PAYMENT_FEE_LOOKUP_ATTEMPTS) {
      await sleep(STRIPE_PAYMENT_FEE_LOOKUP_DELAY_MS);
    }
  }

  return {
    ok: false,
    failure: lastFailure ?? {
      paymentIntentId,
      reason: "stripe_lookup_error",
      message: "Stripe fee lookup failed",
    },
  };
}

export async function getStripePaymentFeeBreakdown(paymentIntentId: string): Promise<StripePaymentFeeBreakdown | null> {
  const lookupResult = await getStripePaymentFeeLookupResult(paymentIntentId);
  return lookupResult.ok ? lookupResult.breakdown : null;
}

export async function createBookingRefund({
  bookingId,
  paymentIntentId,
  amountJpy,
  originalAmountJpy,
  stripeFeeDeductedJpy,
  stripeBalanceTransactionId,
  stripeBalanceTransactionCurrency,
  stripeBalanceTransactionFee,
  stripeExchangeRate,
}: {
  bookingId: string;
  paymentIntentId: string;
  amountJpy: number;
  originalAmountJpy?: number;
  stripeFeeDeductedJpy?: number;
  stripeBalanceTransactionId?: string;
  stripeBalanceTransactionCurrency?: string;
  stripeBalanceTransactionFee?: number;
  stripeExchangeRate?: number | null;
}) {
  return getStripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountJpy,
      reason: "requested_by_customer",
      metadata: {
        bookingId,
        ...(originalAmountJpy != null ? { originalAmountJpy: String(originalAmountJpy) } : {}),
        ...(stripeFeeDeductedJpy != null
          ? {
              feeDeductedJpy: String(stripeFeeDeductedJpy),
              stripeFeeDeductedJpy: String(stripeFeeDeductedJpy),
            }
          : {}),
        ...(stripeBalanceTransactionId ? { stripeBalanceTransactionId } : {}),
        ...(stripeBalanceTransactionCurrency ? { stripeBalanceTransactionCurrency } : {}),
        ...(stripeBalanceTransactionFee != null
          ? { stripeBalanceTransactionFee: String(stripeBalanceTransactionFee) }
          : {}),
        ...(stripeExchangeRate != null ? { stripeExchangeRate: String(stripeExchangeRate) } : {}),
        refundAmountJpy: String(amountJpy),
      },
    },
    {
      idempotencyKey: `booking-cancel-refund-${bookingId}`,
    }
  );
}
