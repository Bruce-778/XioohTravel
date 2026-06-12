import Link from "next/link";
import { db } from "@/lib/db";
import { CheckoutSearchSchema } from "@/lib/validators";
import { canCreateBooking, computeNightFee, isUrgentOrder } from "@/lib/bookingRules";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatDateTimeJST, parseJstDateTime } from "@/lib/timeFormat";
import { getCurrency } from "@/lib/currency";
import { getT, getLocale } from "@/lib/i18n";
import { VEHICLE_NAMES } from "@/lib/locationData";
import { getEffectivePricingRule } from "@/lib/effectivePricing";
import {
  appendOptionalAddressParams,
  getDisplayLocation,
  getOptionalStringParam,
} from "@/lib/locationDisplay";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const currency = await getCurrency();

  const parsed = CheckoutSearchSchema.safeParse({
    tripType: params.tripType,
    fromArea: params.fromArea,
    toArea: params.toArea,
    pickupTime: params.pickupTime,
    passengers: params.passengers,
    children: params.children,
    luggageSmall: params.luggageSmall ?? 0,
    luggageMedium: params.luggageMedium ?? 0,
    luggageLarge: params.luggageLarge ?? 0,
    vehicleTypeId: params.vehicleTypeId
  });

  if (!parsed.success) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="text-sm text-slate-600 mt-2">
            {t("checkout.enterFromVehicles")}
          </div>
          <div className="mt-4 flex gap-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = parsed.data;
  const addressParams = {
    fromAddress: getOptionalStringParam(params, "fromAddress"),
    toAddress: getOptionalStringParam(params, "toAddress"),
  };
  const vehiclesBackParams = appendOptionalAddressParams(new URLSearchParams({
    tripType: q.tripType,
    fromArea: q.fromArea,
    toArea: q.toArea,
    pickupTime: q.pickupTime,
    passengers: String(q.passengers),
    children: String(q.children),
    luggageSmall: String(q.luggageSmall),
    luggageMedium: String(q.luggageMedium),
  }), addressParams);
  const vehiclesBackUrl = `/vehicles?${vehiclesBackParams.toString()}`;
  const bookNowUrl = `/?${vehiclesBackParams.toString()}#book-now`;
  const pickupTime = parseJstDateTime(q.pickupTime);
  const now = new Date();
  if (!canCreateBooking(now, pickupTime)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("api.bookingLeadTime")}</div>
          <div className="mt-3 flex gap-3">
            <Link
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
              href={bookNowUrl}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("vehicles.backBookNow")}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const isUrgent = isUrgentOrder(now, pickupTime);
  const isNight = computeNightFee(pickupTime);

  const { rows: vehicleRows } = await db.query("SELECT * FROM vehicle_types WHERE id = $1", [q.vehicleTypeId]);
  const vehicle = vehicleRows[0];
  
  const vehicleKeyMap: Record<string, string> = {
    [VEHICLE_NAMES.ECONOMY_5]: "5seats",
    [VEHICLE_NAMES.BUSINESS_7]: "7seats",
    [VEHICLE_NAMES.LARGE_9]: "9seats",
    [VEHICLE_NAMES.LUXURY]: "luxury",
    [VEHICLE_NAMES.BUS]: "bus"
  };

  if (!vehicle) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("checkout.noVehicle")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rule = await getEffectivePricingRule({
    fromArea: q.fromArea,
    toArea: q.toArea,
    tripType: q.tripType,
    vehicleTypeId: vehicle.id,
    pickupTime,
  });

  if (!rule) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("checkout.noPrice")}</div>
          <div className="mt-3 flex gap-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const base = rule.basePriceJpy;
  const night = isNight ? rule.nightFeeJpy : 0;
  const urgent = isUrgent ? rule.urgentFeeJpy : 0;
  const defaultPickupLocation = getDisplayLocation(q.fromArea, addressParams.fromAddress, locale);
  const defaultDropoffLocation = getDisplayLocation(q.toArea, addressParams.toAddress, locale);
  const vehicleTranslationKey = vehicleKeyMap[vehicle.name];
  const displayVehicle = vehicleTranslationKey ? t(`vehicle.${vehicleTranslationKey}`) : vehicle.name;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("checkout.title")}</h1>
          <p className="text-slate-600 mt-1">{t("checkout.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
          <Link
            href={vehiclesBackUrl}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("checkout.backVehicles")}
          </Link>
          {rule.source === "override" ? (
            <div className="max-w-full rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold leading-snug text-amber-700">
              {t("pricing.specialPriceApplied")}
            </div>
          ) : null}
        </div>
      </div>
      <CheckoutForm
        preset={{
          ...q,
          defaultPickupLocation,
          defaultDropoffLocation,
        }}
        summary={{
          displayTripType: t(`home.${q.tripType}`),
          displayPickupTime: formatDateTimeJST(pickupTime, locale),
          displayVehicle,
          currency,
          baseJpy: base + urgent + night,
        }}
        locale={locale}
        labels={{
          flightNumber: t("form.flightNumber"),
          pickupLocation: t("form.pickupLocation"),
          dropoffLocation: t("form.dropoffLocation"),
          contactName: t("form.contactName"),
          contactPhone: t("form.contactPhone"),
          contactEmail: t("form.contactEmail"),
          special: t("form.special"),
          summary: t("checkout.summary"),
          itinerarySummary: t("checkout.itinerarySummary"),
          transferDetails: t("checkout.transferDetails"),
          contactInformation: t("checkout.contactInformation"),
          specialRequests: t("checkout.specialRequests"),
          tripType: t("checkout.tripType"),
          pickupTime: t("checkout.pickupTime"),
          passengers: t("search.passengers"),
          children: t("search.children"),
          vehicle: t("checkout.vehicle"),
          basePrice: t("checkout.basePrice"),
          childSeatFee: t("checkout.childSeatFee"),
          childSeatLimitHint: t("checkout.childSeatLimitHint"),
          meetAndGreet: t("checkout.meetAndGreet"),
          meetAndGreetFee: t("checkout.meetAndGreetFee"),
          meetAndGreetLimitHint: t("checkout.meetAndGreetLimitHint"),
          total: t("checkout.total"),
          paymentCancelledTip: t("checkout.paymentCancelledTip"),
          aboutDuration: t("checkout.aboutDuration"),
          approxDistance: t("checkout.approxDistance"),
          addOns: t("checkout.addOns"),
          phoneCountryCode: t("form.phoneCountryCode"),
          phoneLocalNumber: t("form.phoneLocalNumber"),
          selectCountryCode: t("form.selectCountryCode"),
          perSeat: t("checkout.perSeat"),
          perOrder: t("checkout.perOrder"),
          submit: t("form.submit"),
          submitting: t("form.submitting"),
          agree: t("form.agree"),
          orderFailed: t("form.orderFailed"),
          placeholderFlight: t("form.placeholderFlight"),
          placeholderName: t("form.placeholderName"),
          placeholderPhone: t("form.placeholderPhone"),
          placeholderPhoneLocal: t("form.placeholderPhoneLocal"),
          placeholderSpecial: t("form.placeholderSpecial"),
          placeholderAirport: t("search.placeholderAirport"),
          placeholderLocation: t("search.placeholderLocation"),
          locationTip: t("search.locationTip"),
          placeholderEmail: t("form.placeholderEmail"),
          flightNumberRequired: t("form.error.flightNumberRequired"),
          flightNumberInvalid: t("form.error.flightNumberInvalid"),
          pickupLocationRequired: t("form.error.pickupLocationRequired"),
          dropoffLocationRequired: t("form.error.dropoffLocationRequired"),
          contactNameRequired: t("form.error.contactNameRequired"),
          contactPhoneRequired: t("form.error.contactPhoneRequired"),
          contactPhoneInvalid: t("form.error.contactPhoneInvalid"),
          contactEmailRequired: t("form.error.contactEmailRequired"),
          contactEmailInvalid: t("form.error.contactEmailInvalid"),
          phoneCountryCodeRequired: t("form.error.phoneCountryCodeRequired"),
        }}
      />
    </div>
  );
}
