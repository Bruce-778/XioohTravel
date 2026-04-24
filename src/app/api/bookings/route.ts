import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CreateBookingSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";
import {
  attachCheckoutSessionToBooking,
  BookingError,
  createPendingBooking,
  deleteBookingIfPending,
  linkBookingEmailToUser,
} from "@/lib/bookings";
import { createBookingCheckoutSession } from "@/lib/stripe";

export async function POST(req: Request) {
  const { t } = await getT();
  let bookingId: string | null = null;
  let hasCheckoutSession = false;

  try {
    const json = await req.json();
    const parsed = CreateBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const created = await createPendingBooking(data);
    bookingId = created.bookingId;

    const checkoutSession = await createBookingCheckoutSession({
      bookingId: created.bookingId,
      contactEmail: data.contactEmail,
      totalJpy: created.snapshot.total,
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      pickupTime: created.snapshot.pickupTime,
      req,
    });
    hasCheckoutSession = true;

    await attachCheckoutSessionToBooking(created.bookingId, checkoutSession);

    const session = await getSession();
    await linkBookingEmailToUser(session?.userId, data.contactEmail).catch((error) => {
      console.error("Failed to link booking email to user:", error);
    });

    return NextResponse.json({
      bookingId: created.bookingId,
      checkoutUrl: checkoutSession.url,
    });
  } catch (e: any) {
    if (bookingId && !hasCheckoutSession) {
      await deleteBookingIfPending(bookingId).catch(() => undefined);
    }

    if (e instanceof BookingError) {
      return NextResponse.json({ error: t(e.key) }, { status: e.status });
    }
    if (e?.message === "STRIPE_SECRET_KEY is not configured") {
      return NextResponse.json({ error: t("api.stripeNotConfigured") }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
