import Link from "next/link";
import { db } from "@/lib/db";
import { SearchSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder } from "@/lib/bookingRules";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { getCurrency } from "@/lib/currency";
import { getT, getLocale } from "@/lib/i18n";
import { z } from "zod";
import { getPricingAreaCode, getLocalizedLocation, VEHICLE_NAMES } from "@/lib/locationData";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const currency = await getCurrency();

  const ParsedSchema = SearchSchema.extend({ vehicleTypeId: z.string().min(5) });
  const parsed = ParsedSchema.safeParse({
    tripType: params.tripType,
    fromArea: params.fromArea,
    toArea: params.toArea,
    pickupTime: params.pickupTime,
    passengers: params.passengers,
    childSeats: params.childSeats ?? 0,
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
  const pickupTime = new Date(q.pickupTime);
  const now = new Date();
  const isUrgent = isUrgentOrder(now, pickupTime);
  const isNight = computeNightFee(pickupTime);

  const fromCode = getPricingAreaCode(q.fromArea);
  const toCode = getPricingAreaCode(q.toArea);

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

  const { rows: ruleRows } = await db.query(
    `SELECT * FROM pricing_rules 
     WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4
     LIMIT 1`,
    [fromCode, toCode, q.tripType, vehicle.id]
  );
  const rule = ruleRows[0];

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

  const base = rule.base_price_jpy;
  const night = isNight ? rule.night_fee_jpy : 0;
  const urgent = isUrgent ? rule.urgent_fee_jpy : 0;
  const defaultPickupLocation = getLocalizedLocation(q.fromArea, locale);
  const defaultDropoffLocation = getLocalizedLocation(q.toArea, locale);
  const displayVehicle = t(`vehicle.${vehicleKeyMap[vehicle.name] || vehicle.name}`);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("checkout.title")}</h1>
        <p className="text-slate-600 mt-1">{t("checkout.subtitle")}</p>
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
          baseJpy: base,
          nightJpy: night,
          urgentJpy: urgent,
        }}
        locale={locale}
        labels={{
          flightNumber: t("form.flightNumber"),
          flightNote: t("form.flightNote"),
          pickupLocation: t("form.pickupLocation"),
          dropoffLocation: t("form.dropoffLocation"),
          contactName: t("form.contactName"),
          contactPhone: t("form.contactPhone"),
          contactEmail: t("form.contactEmail"),
          special: t("form.special"),
          summary: t("checkout.summary"),
          tripType: t("checkout.tripType"),
          pickupTime: t("checkout.pickupTime"),
          vehicle: t("checkout.vehicle"),
          basePrice: t("checkout.basePrice"),
          nightFee: t("checkout.nightFee"),
          urgentFee: t("checkout.urgentFee"),
          childSeatFee: t("checkout.childSeatFee"),
          meetAndGreet: t("checkout.meetAndGreet"),
          meetAndGreetFee: t("checkout.meetAndGreetFee"),
          total: t("checkout.total"),
          paymentTip: t("checkout.paymentTip"),
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
          placeholderFlightNote: t("form.placeholderFlightNote"),
          placeholderName: t("form.placeholderName"),
          placeholderPhone: t("form.placeholderPhone"),
          placeholderPhoneLocal: t("form.placeholderPhoneLocal"),
          placeholderSpecial: t("form.placeholderSpecial"),
          placeholderAirport: t("search.placeholderAirport"),
          placeholderLocation: t("search.placeholderLocation"),
          locationTip: t("search.locationTip"),
          placeholderEmail: t("form.placeholderEmail"),
          flightNumberRequired: t("form.error.flightNumberRequired"),
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
