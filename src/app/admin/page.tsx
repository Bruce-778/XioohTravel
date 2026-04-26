import { AdminClient } from "@/components/AdminClient";
import { getT, getLocale } from "@/lib/i18n";
import { VEHICLE_NAMES } from "@/lib/locationData";

export default async function AdminPage() {
  const { t } = await getT();
  const locale = await getLocale();
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("admin.title")}</h2>
        <div className="text-sm text-slate-600 mt-1">
          {t("admin.subtitle")}
        </div>
      </div>
      <div className="mt-6">
        <AdminClient
          locale={locale}
          labels={{
            loginTitle: t("admin.loginTitle"),
            loginSubtitle: t("admin.loginSubtitle"),
            enter: t("admin.enter"),
            loading: t("admin.loading"),
            orders: t("admin.orders"),
            edit: t("admin.edit"),
            editTitle: t("admin.editTitle"),
            status: t("admin.status"),
            manualAdjustment: t("admin.manualAdjustment"),
            note: t("admin.note"),
            save: t("admin.save"),
            saving: t("admin.saving"),
            id: t("admin.id"),
            pickupTime: t("admin.pickupTime"),
            route: t("admin.route"),
            vehicle: t("admin.vehicle"),
            amount: t("admin.amount"),
            action: t("admin.action"),
            empty: t("admin.empty"),
            adjustmentHint: t("admin.adjustmentHint"),
            notePlaceholder: t("admin.notePlaceholder"),
            loginPlaceholder: t("admin.loginPlaceholder"),
            urgentTag: t("admin.urgentTag"),
            close: t("admin.close"),
            details: t("admin.details"),
            hideDetails: t("admin.hideDetails"),
            tripSection: t("admin.tripSection"),
            passengersSection: t("admin.passengersSection"),
            contactSection: t("admin.contactSection"),
            pricingSection: t("admin.pricingSection"),
            timelineSection: t("admin.timelineSection"),
            export: t("admin.export"),
            dateType: t("admin.dateType"),
            dateRange: t("admin.dateRange"),
            dateTypeCreated: t("admin.dateTypeCreated"),
            dateTypePickup: t("admin.dateTypePickup"),
            today: t("admin.today"),
            yesterday: t("admin.yesterday"),
            thisMonth: t("admin.thisMonth"),
            all: t("admin.all"),
            filter: t("admin.filter"),
            statuses: {
              PENDING_PAYMENT: t("status.PENDING_PAYMENT"),
              PAID: t("status.PAID"),
              CONFIRMED: t("status.CONFIRMED"),
              IN_SERVICE: t("status.IN_SERVICE"),
              COMPLETED: t("status.COMPLETED"),
              CANCELLED: t("status.CANCELLED")
            },
            vehicles: {
              [VEHICLE_NAMES.ECONOMY_5]: t("vehicle.5seats"),
              [VEHICLE_NAMES.BUSINESS_7]: t("vehicle.7seats"),
              [VEHICLE_NAMES.LARGE_9]: t("vehicle.9seats"),
              [VEHICLE_NAMES.LUXURY]: t("vehicle.luxury"),
              [VEHICLE_NAMES.BUS]: t("vehicle.bus")
            },
            pricing: t("admin.pricing"),
            pricingTitle: t("admin.pricingTitle"),
            pricingSubtitle: t("admin.pricingSubtitle"),
            addRule: t("admin.addRule"),
            editRule: t("admin.editRule"),
            deleteRule: t("admin.deleteRule"),
            fromArea: t("admin.fromArea"),
            toArea: t("admin.toArea"),
            tripType: t("admin.tripType"),
            basePrice: t("admin.basePrice"),
            nightFee: t("admin.nightFee"),
            urgentFee: t("admin.urgentFee"),
            vehicleType: t("admin.vehicleType"),
            create: t("admin.create"),
            creating: t("admin.creating"),
            update: t("admin.update"),
            updating: t("admin.updating"),
            cancel: t("admin.cancel"),
            delete: t("admin.delete"),
            deleting: t("admin.deleting"),
            confirmDelete: t("admin.confirmDelete"),
            deleteConfirmText: t("admin.deleteConfirmText"),
            noRules: t("admin.noRules"),
            fromAreaPlaceholder: t("admin.fromAreaPlaceholder"),
            toAreaPlaceholder: t("admin.toAreaPlaceholder"),
            tabsOrders: t("admin.tabs.orders"),
            tabsPricing: t("admin.tabs.pricing"),
            tripTypes: {
              PICKUP: t("search.pickup"),
              DROPOFF: t("search.dropoff"),
              POINT_TO_POINT: t("search.p2p")
            },
            page: t("admin.page"),
            pageOf: t("admin.pageOf"),
            previous: t("admin.previous"),
            next: t("admin.next"),
            itemsPerPage: t("admin.itemsPerPage"),
            itemsPerPageSuffix: t("admin.itemsPerPageSuffix"),
            startDate: t("admin.startDate"),
            endDate: t("admin.endDate"),
            customDateRange: t("admin.customDateRange"),
            pickupLocation: t("admin.pickupLocation"),
            dropoffLocation: t("admin.dropoffLocation"),
            flightNumber: t("admin.flightNumber"),
            flightNote: t("admin.flightNote"),
            passengersCount: t("admin.passengersCount"),
            childSeats: t("admin.childSeats"),
            meetAndGreet: t("admin.meetAndGreet"),
            luggageSmall: t("admin.luggageSmall"),
            luggageMedium: t("admin.luggageMedium"),
            luggageLarge: t("admin.luggageLarge"),
            contactName: t("admin.contactName"),
            contactPhone: t("admin.contactPhone"),
            contactEmail: t("admin.contactEmail"),
            contactNote: t("admin.contactNote"),
            pricingBase: t("admin.pricingBase"),
            pricingNight: t("admin.pricingNight"),
            pricingUrgent: t("admin.pricingUrgent"),
            pricingChildSeat: t("admin.pricingChildSeat"),
            pricingMeetAndGreet: t("admin.pricingMeetAndGreet"),
            pricingManualAdjustment: t("admin.pricingManualAdjustment"),
            pricingNoteValue: t("admin.pricingNoteValue"),
            createdAt: t("admin.createdAt"),
            cancelledAt: t("admin.cancelledAt"),
            cancelReasonValue: t("admin.cancelReasonValue"),
            notProvided: t("admin.notProvided"),
            yes: t("common.yes"),
            no: t("common.no"),
            loadFailed: t("admin.loadFailed"),
            saveFailed: t("admin.saveFailed"),
            deleteFailed: t("admin.deleteFailed"),
            exportFailed: t("admin.exportFailed"),
            loadVehiclesFailed: t("admin.loadVehiclesFailed"),
            verified: t("admin.verified"),
            pricingRuleNotFound: t("admin.pricingRuleNotFound"),
            vehicleTypeNotFound: t("admin.vehicleTypeNotFound"),
            selectVehicle: t("admin.selectVehicle"),
            pricingLockedHint: t("admin.pricingLockedHint"),
          }}
        />
      </div>
    </div>
  );
}
