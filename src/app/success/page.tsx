import Link from "next/link";
import { getT, getLocale } from "@/lib/i18n";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { getLocalizedLocation, VEHICLE_NAMES } from "@/lib/locationData";
import {
  getBookingById,
  getBookingIdFromCheckoutSession,
  syncBookingPaymentFromCheckoutSession,
} from "@/lib/bookings";
import { retrieveCheckoutSession } from "@/lib/stripe";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  let bookingId = typeof sp.bookingId === "string" ? sp.bookingId : null;

  if (sessionId) {
    try {
      const checkoutSession = await retrieveCheckoutSession(sessionId);
      bookingId = getBookingIdFromCheckoutSession(checkoutSession) ?? bookingId;
      if (checkoutSession.payment_status === "paid") {
        await syncBookingPaymentFromCheckoutSession(checkoutSession);
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (!bookingId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{t("orders.none")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const vehicleKeyMap: Record<string, string> = {
    [VEHICLE_NAMES.ECONOMY_5]: "5seats",
    [VEHICLE_NAMES.BUSINESS_7]: "7seats",
    [VEHICLE_NAMES.LARGE_9]: "9seats",
    [VEHICLE_NAMES.LUXURY]: "luxury",
    [VEHICLE_NAMES.BUS]: "bus",
  };
  const displayStatus = t(`status.${booking.status}`);
  const ordersHref = `/orders?email=${encodeURIComponent(booking.contact_email)}`;
  const vehicleTranslationKey = booking.vehicle_name ? vehicleKeyMap[booking.vehicle_name] : null;
  const displayVehicle = vehicleTranslationKey
    ? t(`vehicle.${vehicleTranslationKey}`)
    : booking.vehicle_name ?? "-";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="card-elevated p-8 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mb-6 shadow-lg animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t("success.badge")}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
            {t("success.title")}
          </h1>
          <p className="text-slate-600 mb-8">{t("success.subtitle")}</p>

          <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("orders.id")}</span>
                <span className="font-mono font-semibold text-slate-900">{booking.id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("orders.status")}</span>
                <span className="font-semibold text-slate-900">{displayStatus}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("orders.vehicle")}</span>
                <span className="font-semibold text-slate-900">{displayVehicle}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.pickupTime")}</span>
                <span className="font-semibold text-slate-900">{formatDateTimeJST(booking.pickup_time, locale)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.childSeats")}</span>
                <span className="font-semibold text-slate-900">{booking.child_seats}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.meetAndGreet")}</span>
                <span className="font-semibold text-slate-900">{booking.meet_and_greet_sign ? t("common.yes") : t("common.no")}</span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.pickupLocation")}</span>
                <span className="font-semibold text-slate-900">{getLocalizedLocation(booking.pickup_location, locale)}</span>
              </div>
              <div className="flex flex-col gap-1 py-2">
                <span className="text-slate-500 font-medium">{t("success.dropoffLocation")}</span>
                <span className="font-semibold text-slate-900">{getLocalizedLocation(booking.dropoff_location, locale)}</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href={ordersHref}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t("success.viewOrders")}
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-900 font-semibold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
