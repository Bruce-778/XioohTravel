import Link from "next/link";
import { db } from "@/lib/db";
import { SearchSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder, CHILD_SEAT_FEE_JPY } from "@/lib/bookingRules";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { formatMoneyFromJpy, getCurrency } from "@/lib/currency";
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
  const isZh = locale.startsWith("zh");
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
  const childSeat = (q.childSeats || 0) * CHILD_SEAT_FEE_JPY;
  const total = base + night + urgent + childSeat;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("checkout.title")}</h1>
            <p className="text-slate-600 mt-1">{t("checkout.subtitle")}</p>
          </div>
          <CheckoutForm 
            preset={{
              ...q,
              fromArea: getLocalizedLocation(q.fromArea, locale),
              toArea: getLocalizedLocation(q.toArea, locale)
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
              childSeatFee: t("checkout.childSeatFee"),
              submit: t("form.submit"),
              submitting: t("form.submitting"),
              agree: t("form.agree"),
              orderFailed: t("form.orderFailed"),
              airportTag: t("checkout.airportTag"),
              placeholderFlight: t("form.placeholderFlight"),
              placeholderFlightNote: t("form.placeholderFlightNote"),
              placeholderName: t("form.placeholderName"),
              placeholderPhone: t("form.placeholderPhone"),
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
            }} 
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900">{t("checkout.summary")}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t("checkout.tripType")}</span>
                    <span className="font-medium text-slate-900">{t(`home.${q.tripType}`)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t("checkout.pickupTime")}</span>
                    <span className="font-medium text-slate-900">{formatDateTimeJST(pickupTime, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t("checkout.vehicle")}</span>
                    <span className="font-medium text-slate-900">
                      {t(`vehicle.${vehicleKeyMap[vehicle.name] || vehicle.name}`)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t("checkout.basePrice")}</span>
                    <span className="text-slate-900">{formatMoneyFromJpy(base, currency, locale)}</span>
                  </div>
                  {isNight && (
                    <div className="flex justify-between text-sm text-slate-900">
                      <span className="text-slate-500">{t("checkout.nightFee")}</span>
                      <span>+{formatMoneyFromJpy(night, currency, locale)}</span>
                    </div>
                  )}
                  {isUrgent && (
                    <div className="flex justify-between text-sm text-slate-900">
                      <span className="text-slate-500">{t("checkout.urgentFee")}</span>
                      <span>+{formatMoneyFromJpy(urgent, currency, locale)}</span>
                    </div>
                  )}
                  {childSeat > 0 && (
                    <div className="flex justify-between text-sm text-slate-900">
                      <span className="text-slate-500">{t("checkout.childSeatFee")}</span>
                      <span>+{formatMoneyFromJpy(childSeat, currency, locale)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">{t("checkout.total")}</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-brand-700">
                        {formatMoneyFromJpy(total, currency, locale)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
              <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                {t("checkout.paymentTip")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
