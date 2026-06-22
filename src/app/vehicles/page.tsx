import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { SearchSchema } from "@/lib/validators";
import { canCreateBooking, computeNightFee, isUrgentOrder } from "@/lib/bookingRules";
import { formatDateTimeJST, parseJstDateTime } from "@/lib/timeFormat";
import { formatMoneyFromJpy, getCurrency } from "@/lib/currency";
import { getT, getLocale } from "@/lib/i18n";
import { VEHICLE_NAMES } from "@/lib/locationData";
import {
  appendOptionalAddressParams,
  getDisplayLocation,
  getOptionalStringParam,
} from "@/lib/locationDisplay";
import { getVehicleImageByKey } from "@/lib/vehicleImages";
import { getEffectivePricingRulesForRoute } from "@/lib/effectivePricing";
import { LuggageCapacityDisplay, type LuggageDisplayLabels } from "@/components/LuggageCapacityDisplay";
import { TrackedLink } from "@/components/TrackedActions";

function formatPassengerSummary({
  passengers,
  children,
  locale,
  t,
}: {
  passengers: number;
  children: number;
  locale: "zh" | "en";
  t: (key: string) => string;
}) {
  const passengerText = `${passengers} ${t("common.passengers")}`;
  if (children <= 0) return passengerText;

  if (locale === "zh") {
    return `${passengerText}（${t("common.including")} ${children} ${t("common.child")}）`;
  }

  const childLabel = children === 1 ? t("common.child") : t("common.children");
  return `${passengerText} (${t("common.including")} ${children} ${childLabel})`;
}

export default async function VehiclesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const currency = await getCurrency();
  const luggageLabels: LuggageDisplayLabels = {
    carryOn: t("luggage.carryOn"),
    mediumSuitcase: t("luggage.mediumSuitcase"),
    carryOnSize: t("luggage.carryOnSize"),
    mediumSize: t("luggage.mediumSize"),
  };
  const parsed = SearchSchema.safeParse({
    tripType: params.tripType,
    fromArea: params.fromArea,
    toArea: params.toArea,
    pickupTime: params.pickupTime,
    passengers: params.passengers,
    children: params.children,
    luggageSmall: params.luggageSmall ?? 0,
    luggageMedium: params.luggageMedium ?? 0,
    luggageLarge: params.luggageLarge ?? 0
  });

  if (!parsed.success) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="text-sm text-slate-600 mt-2">
            {t("checkout.enterFromVehicles")}
          </div>
          <div className="mt-4">
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
  const bookNowParams = appendOptionalAddressParams(new URLSearchParams({
    tripType: q.tripType,
    fromArea: q.fromArea,
    toArea: q.toArea,
    pickupTime: q.pickupTime,
    passengers: String(q.passengers),
    children: String(q.children),
    luggageSmall: String(q.luggageSmall),
    luggageMedium: String(q.luggageMedium),
  }), addressParams);
  const bookNowUrl = `/?${bookNowParams.toString()}#book-now`;
  const pickupTime = parseJstDateTime(q.pickupTime);
  const now = new Date();
  if (!canCreateBooking(now, pickupTime)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("api.bookingLeadTime")}</div>
          <div className="mt-4">
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
  const displayFromLocation = getDisplayLocation(q.fromArea, addressParams.fromAddress, locale);
  const displayToLocation = getDisplayLocation(q.toArea, addressParams.toAddress, locale);
  const passengerSummary = formatPassengerSummary({
    passengers: q.passengers,
    children: q.children,
    locale,
    t,
  });

  const { rows: vehicleTypes } = await db.query(
    "SELECT * FROM vehicle_types ORDER BY is_bus ASC, is_luxury ASC, seats ASC"
  );

  const rules = await getEffectivePricingRulesForRoute({
    fromArea: q.fromArea,
    toArea: q.toArea,
    tripType: q.tripType,
    pickupTime,
  });
  const ruleByVehicle = new Map(rules.map((rule) => [rule.vehicleTypeId, rule]));

  const vehicleKeyMap: Record<string, string> = {
    [VEHICLE_NAMES.ECONOMY_5]: "5seats",
    [VEHICLE_NAMES.BUSINESS_7]: "7seats",
    [VEHICLE_NAMES.LARGE_9]: "9seats",
    [VEHICLE_NAMES.LUXURY]: "luxury",
    [VEHICLE_NAMES.BUS]: "bus"
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("vehicles.title")}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-600">
            <span>
              {displayFromLocation} → {displayToLocation} · {formatDateTimeJST(pickupTime, locale)} · {passengerSummary}
            </span>
            <span className="font-medium text-slate-700">{t("luggage.requested")}</span>
            <LuggageCapacityDisplay
              small={q.luggageSmall}
              medium={q.luggageMedium}
              labels={luggageLabels}
              showSizes
              className="gap-1.5"
            />
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm md:items-end">
          <Link
            href={bookNowUrl}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 font-semibold text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("vehicles.backBookNow")}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6">
        {vehicleTypes.map((v) => {
          const rule = ruleByVehicle.get(v.id);
          const hasRule = !!rule;
          const vehicleKey = vehicleKeyMap[v.name] || v.name;
          const vehicleLabel = t(`vehicle.${vehicleKey}`);
          const vehicleImage = getVehicleImageByKey(vehicleKey);
          
          let priceJpy = 0;
          if (hasRule) {
            priceJpy = rule.basePriceJpy + (isNight ? rule.nightFeeJpy : 0) + (isUrgent ? rule.urgentFeeJpy : 0);
          }

          const capacityExceeded =
            q.passengers > v.seats ||
            q.luggageSmall > v.luggage_small ||
            q.luggageMedium > v.luggage_medium;

          const checkoutParams = appendOptionalAddressParams(new URLSearchParams({
            tripType: q.tripType,
            fromArea: q.fromArea,
            toArea: q.toArea,
            pickupTime: q.pickupTime,
            passengers: String(q.passengers),
            children: String(q.children),
            luggageSmall: String(q.luggageSmall),
            luggageMedium: String(q.luggageMedium),
            vehicleTypeId: v.id,
          }), addressParams);
          const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

          return (
            <div
              key={v.id}
              className={`p-6 bg-white border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
                capacityExceeded || !hasRule ? "opacity-60 grayscale-[0.5]" : "hover:border-brand-300 hover:shadow-md"
              }`}
            >
              {vehicleImage ? (
                <div className="relative h-32 w-full shrink-0 md:h-28 md:w-44 lg:h-32 lg:w-52">
                  <Image
                    src={vehicleImage}
                    alt={vehicleLabel}
                    fill
                    sizes="(min-width: 1024px) 208px, (min-width: 768px) 176px, calc(100vw - 80px)"
                    className="object-contain p-1"
                  />
                </div>
              ) : null}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {vehicleLabel}
                  </h3>
                  {v.is_luxury && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                      {t("vehicles.tag.luxury")}
                    </span>
                  )}
                  {v.is_bus && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                      {t("vehicles.tag.bus")}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{v.seats} {t("common.seats")}</span>
                  </div>
                  <LuggageCapacityDisplay
                    small={v.luggage_small}
                    medium={v.luggage_medium}
                    labels={luggageLabels}
                  />
                </div>

                <div className="mt-3 text-sm text-slate-500 leading-relaxed max-w-xl">
                  {t(`vehicle.desc.${vehicleKey}`)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 min-w-[160px]">
                {hasRule ? (
                  <>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">{t("vehicles.startingAt")}</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatMoneyFromJpy(priceJpy, currency, locale)}
                      </div>
                      {rule.source === "override" ? (
                        <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          {t("pricing.specialPriceApplied")}
                        </div>
                      ) : null}
                    </div>
                    {capacityExceeded ? (
                      <button disabled className="w-full px-6 py-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed">
                        {t("vehicles.capacityLimit")}
                      </button>
                    ) : (
                      <TrackedLink
                        href={checkoutUrl}
                        eventName="select_vehicle"
                        eventPayload={{
                          trip_type: q.tripType,
                          from_area: q.fromArea,
                          to_area: q.toArea,
                          route: `${q.fromArea} -> ${q.toArea}`,
                          pickup_time: q.pickupTime,
                          passengers: q.passengers,
                          children: q.children,
                          luggage_small: q.luggageSmall,
                          luggage_medium: q.luggageMedium,
                          vehicle_type_id: v.id,
                          vehicle_name: vehicleLabel,
                          value: priceJpy,
                          currency: "JPY",
                        }}
                        className="w-full px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm"
                      >
                        {t("vehicles.bookNow")}
                      </TrackedLink>
                    )}
                  </>
                ) : (
                  <div className="text-right">
                    <div className="text-sm text-slate-500 italic">{t("checkout.noPrice")}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
