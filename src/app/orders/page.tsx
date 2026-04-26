import { OrdersClient } from "@/components/OrdersClient";
import { getT, getLocale } from "@/lib/i18n";
import { TravelShowcase } from "@/components/TravelShowcase";
import { VEHICLE_NAMES } from "@/lib/locationData";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getT();
  const locale = await getLocale();
  const params = await searchParams;
  const initialEmail = typeof params.email === "string" ? params.email : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("orders.title")}</h2>
          <div className="text-sm text-slate-600 mt-1">{t("orders.subtitle")}</div>
        </div>
      </div>
      <TravelShowcase />
      <div className="mt-6">
        <OrdersClient
          locale={locale}
          initialEmail={initialEmail}
          labels={{
            queryTitle: t("orders.queryTitle"),
            querySubtitle: t("orders.querySubtitle"),
            email: t("orders.email"),
            search: t("orders.search"),
            searching: t("orders.searching"),
            list: t("orders.list"),
            none: t("orders.none"),
            cancel: t("orders.cancel"),
            cancelled: t("orders.cancelled"),
            cancelTitle: t("orders.cancelTitle"),
            cancelReason: t("orders.cancelReason"),
            cancelConfirm: t("orders.cancelConfirm"),
            close: t("orders.close"),
            processing: t("orders.processing"),
            urgentHint: t("vehicles.urgent"),
            queryFailed: t("orders.queryFailed"),
            cancelFailed: t("orders.cancelFailed"),
            id: t("orders.id"),
            pickup: t("orders.pickup"),
            vehicle: t("orders.vehicle"),
            amount: t("orders.amount"),
            status: t("orders.status"),
            action: t("orders.action"),
            urgentTag: t("orders.urgentTag"),
            cancelReasonDefault: t("orders.cancelReasonDefault"),
            statuses: {
              PENDING_PAYMENT: t("status.PENDING_PAYMENT"),
              PAID: t("status.PAID"),
              CONFIRMED: t("status.CONFIRMED"),
              IN_SERVICE: t("status.IN_SERVICE"),
              COMPLETED: t("status.COMPLETED"),
              CANCELLED: t("status.CANCELLED"),
            },
            vehicles: {
              [VEHICLE_NAMES.ECONOMY_5]: t("vehicle.5seats"),
              [VEHICLE_NAMES.BUSINESS_7]: t("vehicle.7seats"),
              [VEHICLE_NAMES.LARGE_9]: t("vehicle.9seats"),
              [VEHICLE_NAMES.LUXURY]: t("vehicle.luxury"),
              [VEHICLE_NAMES.BUS]: t("vehicle.bus"),
            },
            account: t("orders.account"),
            refresh: t("orders.refresh"),
            loginRequired: t("orders.loginRequired"),
            loginDesc: t("orders.loginDesc"),
            loginButton: t("orders.loginButton"),
            cancelReasonPlaceholder: t("orders.cancelReasonPlaceholder"),
            retryPayment: t("orders.retryPayment"),
            retryingPayment: t("orders.retryingPayment"),
            emailRequired: t("orders.emailRequired"),
            guestLookupHint: t("orders.guestLookupHint"),
            pendingPaymentHint: t("orders.pendingPaymentHint"),
            details: t("orders.details"),
            hideDetails: t("orders.hideDetails"),
            tripSection: t("orders.tripSection"),
            passengersSection: t("orders.passengersSection"),
            contactSection: t("orders.contactSection"),
            pricingSection: t("orders.pricingSection"),
            timelineSection: t("orders.timelineSection"),
            tripType: t("orders.tripType"),
            pickupLocation: t("orders.pickupLocation"),
            dropoffLocation: t("orders.dropoffLocation"),
            flightNumber: t("orders.flightNumber"),
            flightNote: t("orders.flightNote"),
            passengersCount: t("orders.passengersCount"),
            childSeats: t("orders.childSeats"),
            meetAndGreet: t("orders.meetAndGreet"),
            luggageSmall: t("orders.luggageSmall"),
            luggageMedium: t("orders.luggageMedium"),
            luggageLarge: t("orders.luggageLarge"),
            contactName: t("orders.contactName"),
            contactPhone: t("orders.contactPhone"),
            contactEmail: t("orders.contactEmail"),
            contactNote: t("orders.contactNote"),
            pricingBase: t("orders.pricingBase"),
            pricingNight: t("orders.pricingNight"),
            pricingUrgent: t("orders.pricingUrgent"),
            pricingChildSeat: t("orders.pricingChildSeat"),
            pricingMeetAndGreet: t("orders.pricingMeetAndGreet"),
            pricingManualAdjustment: t("orders.pricingManualAdjustment"),
            pricingNote: t("orders.pricingNote"),
            createdAt: t("orders.createdAt"),
            cancelledAt: t("orders.cancelledAt"),
            cancelReasonValue: t("orders.cancelReasonValue"),
            notProvided: t("orders.notProvided"),
            yes: t("common.yes"),
            no: t("common.no"),
            tripTypes: {
              PICKUP: t("home.PICKUP"),
              DROPOFF: t("home.DROPOFF"),
              POINT_TO_POINT: t("home.POINT_TO_POINT"),
            },
          }} 
        />
      </div>
    </div>
  );
}
