"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import type { Currency } from "@/lib/currency";
import { CHILD_SEAT_FEE_JPY, MEET_AND_GREET_SIGN_FEE_JPY } from "@/lib/bookingRules";
import {
  PHONE_COUNTRY_CODE_OPTIONS,
  getCompactPhoneCountryLabel,
  getFlagEmoji,
  getPhoneCountryLabel,
  getPhoneCountryName,
} from "@/lib/phoneCountryCodes";
import {
  isValidFlightNumber,
  normalizeFlightNumber,
  normalizeFlightNumberInput,
} from "@/lib/flightNumber";
import { loadGoogleMaps, logGoogleMapsDiagnostic } from "@/lib/googleMapsClient";

type Preset = {
  tripType: "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
  fromArea: string;
  toArea: string;
  pickupTime: string;
  passengers: number;
  children: number;
  luggageSmall: number;
  luggageMedium: number;
  vehicleTypeId: string;
  defaultPickupLocation: string;
  defaultDropoffLocation: string;
};

type Summary = {
  displayTripType: string;
  displayPickupTime: string;
  displayVehicle: string;
  currency: Currency;
  baseJpy: number;
};

type Labels = {
  flightNumber: string;
  pickupLocation: string;
  dropoffLocation: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  special: string;
  summary: string;
  itinerarySummary: string;
  transferDetails: string;
  contactInformation: string;
  specialRequests: string;
  tripType: string;
  pickupTime: string;
  passengers: string;
  children: string;
  vehicle: string;
  basePrice: string;
  childSeatFee: string;
  childSeatLimitHint: string;
  meetAndGreet: string;
  meetAndGreetFee: string;
  meetAndGreetLimitHint: string;
  total: string;
  paymentCancelledTip: string;
  aboutDuration: string;
  approxDistance: string;
  addOns: string;
  phoneCountryCode: string;
  phoneLocalNumber: string;
  selectCountryCode: string;
  perSeat: string;
  perOrder: string;
  submit: string;
  submitting: string;
  agree: string;
  orderFailed: string;
  placeholderFlight: string;
  placeholderName: string;
  placeholderPhone: string;
  placeholderPhoneLocal: string;
  placeholderSpecial: string;
  placeholderAirport: string;
  placeholderLocation: string;
  locationTip: string;
  placeholderEmail?: string;
  flightNumberRequired: string;
  flightNumberInvalid: string;
  pickupLocationRequired: string;
  dropoffLocationRequired: string;
  contactNameRequired: string;
  contactPhoneRequired: string;
  contactPhoneInvalid: string;
  contactEmailRequired: string;
  contactEmailInvalid: string;
  phoneCountryCodeRequired: string;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm block">
      <div className="mb-1.5 font-semibold text-slate-900">{label}</div>
      {children}
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm items-start">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 break-words">{value}</span>
    </div>
  );
}

function AddOnQuantityCard({
  label,
  priceText,
  icon,
  value,
  max,
  limitHint,
  onChange,
}: {
  label: string;
  priceText: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  limitHint: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-brand-600">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{priceText}</div>
          </div>
        </div>
        <input
          type="number"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) {
              onChange(0);
              return;
            }
            onChange(Math.min(max, Math.max(0, Math.trunc(next))));
          }}
          aria-label={label}
          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white px-1 text-center text-sm font-bold text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </label>
      {value >= max ? (
        <div className="text-xs font-medium text-amber-700">{limitHint}</div>
      ) : null}
    </div>
  );
}

function ChildSeatIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.5 20v-4.5a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4V20" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 20h10.5a2.5 2.5 0 0 0 2.5-2.5V5" />
    </svg>
  );
}

function MeetAndGreetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 9h8M8 13h5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 4.5V3m4 1.5V3" />
    </svg>
  );
}

function SummarySectionHeader({
  title,
  toneClassName,
  icon,
}: {
  title: string;
  toneClassName: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm ${toneClassName}`}
      >
        {icon}
      </div>
      <h2 className="font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function ItineraryTimeline({
  pickupTime,
  pickupLocation,
  dropoffTime,
  dropoffLocation,
  estimateState,
  labels,
}: {
  pickupTime: string;
  pickupLocation: string;
  dropoffTime: string;
  dropoffLocation: string;
  estimateState: RouteEstimateState;
  labels: Pick<Labels, "aboutDuration" | "approxDistance" | "dropoffLocation">;
}) {
  const estimate = estimateState.status === "success" ? estimateState.estimate : null;
  const estimateText = estimate
    ? `${formatTemplate(labels.aboutDuration, { duration: estimate.durationText })} · ${formatTemplate(
        labels.approxDistance,
        { distance: estimate.distanceText }
      )}`
    : null;

  return (
    <div className="relative pl-8">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-300" />

      <div className="relative pb-5">
        <span className="absolute -left-8 top-0.5 h-4 w-4 rounded-full border border-slate-900 bg-white" />
        <div className="text-sm font-semibold leading-5 text-slate-900">{pickupTime}</div>
        <div className="mt-1 text-sm font-bold leading-5 text-slate-950 break-words">
          {pickupLocation}
        </div>
      </div>

      <div className="relative pb-5">
        {estimateText ? (
          <div className="text-xs font-semibold leading-5 text-slate-700">{estimateText}</div>
        ) : (
          <div className="h-5" aria-hidden="true" />
        )}
      </div>

      <div className="relative">
        <span className="absolute -left-8 top-0.5 h-4 w-4 rounded-full border border-slate-900 bg-white" />
        <div className="text-sm font-semibold leading-5 text-slate-900">
          {dropoffTime || labels.dropoffLocation}
        </div>
        <div className="mt-1 text-sm font-bold leading-5 text-slate-950 break-words">
          {dropoffLocation}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyLocationField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="text-sm">
      <div className="mb-1.5 font-semibold text-slate-900">{label}</div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" />
        </svg>
        <span className="font-medium leading-relaxed break-words">{value}</span>
      </div>
    </div>
  );
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildContactPhone(countryCode: string, localNumber: string) {
  return `${countryCode} ${localNumber.trim().replace(/\s+/g, " ")}`.trim();
}

const CHECKOUT_DRAFT_STORAGE_PREFIX = "xioohtravel.checkoutDraft.";

type CheckoutDraft = {
  flightNumber: string;
  contactName: string;
  phoneCountryCode: string;
  phoneCountryRegionCode: string;
  phoneLocalNumber: string;
  contactEmail: string;
  contactNote: string;
  childSeats: number;
  meetAndGreetSignCount: number;
  meetAndGreetSign?: boolean;
};

type RouteEstimate = {
  distanceText: string;
  durationText: string;
  durationSeconds: number;
};

type RouteEstimateState =
  | { status: "idle"; estimate: null; error: null }
  | { status: "loading"; estimate: null; error: null }
  | { status: "success"; estimate: RouteEstimate; error: null }
  | { status: "error"; estimate: null; error: string };

function parseJstDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute)
    )
  );
}

function formatTimelineDateTime(date: Date, locale: string) {
  const localeTag = locale.startsWith("zh") ? "zh-CN" : "en";
  return new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    template
  );
}

function getRouteEstimateAddress(value: string) {
  return value.toLowerCase().includes("japan") || value.includes("日本")
    ? value
    : `${value}, Japan`;
}

function requestRouteEstimate({
  pickupLocation,
  dropoffLocation,
  locale,
}: {
  pickupLocation: string;
  dropoffLocation: string;
  locale: string;
}) {
  return loadGoogleMaps(["distanceMatrix"], locale).then(
    (google) =>
      new Promise<RouteEstimate>((resolve, reject) => {
        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
          {
            origins: [getRouteEstimateAddress(pickupLocation)],
            destinations: [getRouteEstimateAddress(dropoffLocation)],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: "JP",
            language: locale.startsWith("zh") ? "zh-CN" : "en",
          },
          (response: any, status: string) => {
            const okStatus = google.maps.DistanceMatrixStatus?.OK ?? "OK";
            if (status !== okStatus) {
              logGoogleMapsDiagnostic("Distance Matrix returned a non-OK status", {
                status,
                pickupLocation,
                dropoffLocation,
              });
              reject(new Error(`Distance Matrix status: ${status}`));
              return;
            }

            const element = response?.rows?.[0]?.elements?.[0];
            if (element?.status !== "OK" || !element?.duration || !element?.distance) {
              logGoogleMapsDiagnostic("Distance Matrix result is missing route distance or duration", {
                elementStatus: element?.status,
                hasDuration: Boolean(element?.duration),
                hasDistance: Boolean(element?.distance),
                pickupLocation,
                dropoffLocation,
              });
              reject(new Error(`Distance Matrix element status: ${element?.status ?? "missing"}`));
              return;
            }

            resolve({
              distanceText: element.distance.text,
              durationText: element.duration.text,
              durationSeconds: element.duration.value,
            });
          }
        );
      })
  );
}

function getCheckoutDraftStorageKey(bookingId: string) {
  return `${CHECKOUT_DRAFT_STORAGE_PREFIX}${bookingId}`;
}

export function CheckoutForm({
  preset,
  summary,
  labels,
  locale = "zh",
}: {
  preset: Preset;
  summary: Summary;
  labels: Labels;
  locale?: string;
}) {
  const pickupLocation = preset.defaultPickupLocation;
  const dropoffLocation = preset.defaultDropoffLocation;
  const [flightNumber, setFlightNumber] = useState("");
  const [isFlightNumberTouched, setIsFlightNumberTouched] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneCountryRegionCode, setPhoneCountryRegionCode] = useState("");
  const [isPhoneCountryMenuOpen, setIsPhoneCountryMenuOpen] = useState(false);
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [childSeats, setChildSeats] = useState(0);
  const [meetAndGreetSignCount, setMeetAndGreetSignCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentCancelledReturn, setIsPaymentCancelledReturn] = useState(false);
  const [routeEstimateState, setRouteEstimateState] = useState<RouteEstimateState>({
    status: "idle",
    estimate: null,
    error: null,
  });
  const phoneFieldRef = useRef<HTMLDivElement>(null);
  const phoneLocalInputRef = useRef<HTMLInputElement>(null);

  const phoneCountryOptions = useMemo(() => {
    const localeTag = locale.startsWith("zh") ? "zh-CN" : "en";

    return PHONE_COUNTRY_CODE_OPTIONS.map((option) => ({
      ...option,
      countryName: getPhoneCountryName(option.regionCode, localeTag),
      label: getPhoneCountryLabel(option.regionCode, option.dialCode, localeTag),
      fullLabel: `${getFlagEmoji(option.regionCode)} ${getPhoneCountryLabel(
        option.regionCode,
        option.dialCode,
        localeTag
      )}`,
      displayLabel: getCompactPhoneCountryLabel(option.regionCode, option.dialCode),
      selectValue: `${option.regionCode}::${option.dialCode}`,
    })).sort((left, right) => left.countryName.localeCompare(right.countryName, localeTag));
  }, [locale]);

  const selectedPhoneCountryOption = useMemo(
    () =>
      phoneCountryOptions.find(
        (option) =>
          option.regionCode === phoneCountryRegionCode && option.dialCode === phoneCountryCode
      ) ?? null,
    [phoneCountryCode, phoneCountryOptions, phoneCountryRegionCode]
  );

  useEffect(() => {
    function handlePhoneCountryOutsideClick(event: MouseEvent) {
      if (!phoneFieldRef.current?.contains(event.target as Node)) {
        setIsPhoneCountryMenuOpen(false);
      }
    }

    function handlePhoneCountryEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPhoneCountryMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePhoneCountryOutsideClick);
    document.addEventListener("keydown", handlePhoneCountryEscape);

    return () => {
      document.removeEventListener("mousedown", handlePhoneCountryOutsideClick);
      document.removeEventListener("keydown", handlePhoneCountryEscape);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "cancelled") {
      return;
    }

    setIsPaymentCancelledReturn(true);

    const bookingId = params.get("bookingId");
    if (!bookingId) {
      return;
    }

    try {
      const draftJson = window.sessionStorage.getItem(getCheckoutDraftStorageKey(bookingId));
      if (!draftJson) {
        return;
      }

      const draft = JSON.parse(draftJson) as Partial<CheckoutDraft>;
      if (typeof draft.flightNumber === "string") setFlightNumber(draft.flightNumber);
      if (typeof draft.contactName === "string") setContactName(draft.contactName);
      if (typeof draft.phoneCountryCode === "string") setPhoneCountryCode(draft.phoneCountryCode);
      if (typeof draft.phoneCountryRegionCode === "string") {
        setPhoneCountryRegionCode(draft.phoneCountryRegionCode);
      }
      if (typeof draft.phoneLocalNumber === "string") setPhoneLocalNumber(draft.phoneLocalNumber);
      if (typeof draft.contactEmail === "string") setContactEmail(draft.contactEmail);
      if (typeof draft.contactNote === "string") setContactNote(draft.contactNote);
      if (typeof draft.childSeats === "number") {
        setChildSeats(Math.min(2, Math.max(0, Math.trunc(draft.childSeats))));
      }
      if (typeof draft.meetAndGreetSignCount === "number") {
        setMeetAndGreetSignCount(Math.min(1, Math.max(0, Math.trunc(draft.meetAndGreetSignCount))));
      } else if (typeof draft.meetAndGreetSign === "boolean") {
        setMeetAndGreetSignCount(draft.meetAndGreetSign ? 1 : 0);
      }
    } catch {
      // A corrupted local draft should never block checkout.
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!pickupLocation || !dropoffLocation) {
      setRouteEstimateState({ status: "idle", estimate: null, error: null });
      return () => {
        isActive = false;
      };
    }

    setRouteEstimateState({ status: "loading", estimate: null, error: null });
    requestRouteEstimate({ pickupLocation, dropoffLocation, locale })
      .then((estimate) => {
        if (isActive) {
          setRouteEstimateState({ status: "success", estimate, error: null });
        }
      })
      .catch((error) => {
        logGoogleMapsDiagnostic("Route estimate request failed", {
          message: error instanceof Error ? error.message : String(error),
          pickupLocation,
          dropoffLocation,
        });
        if (isActive) {
          setRouteEstimateState({
            status: "error",
            estimate: null,
            error: error instanceof Error ? error.message : "Route estimate failed",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [dropoffLocation, locale, pickupLocation]);

  const normalizedFlightNumber = useMemo(
    () => normalizeFlightNumber(flightNumber),
    [flightNumber]
  );

  const flightNumberInvalid =
    normalizedFlightNumber.length > 0 && !isValidFlightNumber(normalizedFlightNumber);

  const pickupDate = useMemo(() => parseJstDateTime(preset.pickupTime), [preset.pickupTime]);
  const arrivalDate = useMemo(
    () =>
      routeEstimateState.status === "success"
        ? new Date(pickupDate.getTime() + routeEstimateState.estimate.durationSeconds * 1000)
        : null,
    [pickupDate, routeEstimateState]
  );
  const timelinePickupTime = useMemo(
    () => formatTimelineDateTime(pickupDate, locale),
    [locale, pickupDate]
  );
  const timelineDropoffTime = useMemo(
    () => (arrivalDate ? formatTimelineDateTime(arrivalDate, locale) : ""),
    [arrivalDate, locale]
  );

  const pricing = useMemo(() => {
    const childSeatJpy = childSeats * CHILD_SEAT_FEE_JPY;
    const meetAndGreetJpy = meetAndGreetSignCount * MEET_AND_GREET_SIGN_FEE_JPY;
    const totalJpy =
      summary.baseJpy +
      childSeatJpy +
      meetAndGreetJpy;

    return {
      childSeatJpy,
      meetAndGreetJpy,
      totalJpy,
    };
  }, [childSeats, meetAndGreetSignCount, summary.baseJpy]);

  const payload = useMemo(
    () => ({
      tripType: preset.tripType,
      fromArea: preset.fromArea,
      toArea: preset.toArea,
      pickupTime: preset.pickupTime,
      pickupLocation,
      dropoffLocation,
      passengers: preset.passengers,
      children: preset.children ?? 0,
      childSeats,
      meetAndGreetSign: meetAndGreetSignCount > 0,
      luggageSmall: preset.luggageSmall,
      luggageMedium: preset.luggageMedium,
      vehicleTypeId: preset.vehicleTypeId,
      flightNumber: normalizedFlightNumber || undefined,
      contactName: contactName.trim(),
      contactPhone: buildContactPhone(phoneCountryCode, phoneLocalNumber),
      contactEmail: contactEmail.trim(),
      contactNote: contactNote.trim() || undefined,
    }),
    [
      preset.tripType,
      preset.fromArea,
      preset.toArea,
      preset.pickupTime,
      preset.passengers,
      preset.children,
      preset.luggageSmall,
      preset.luggageMedium,
      preset.vehicleTypeId,
      pickupLocation,
      dropoffLocation,
      childSeats,
      meetAndGreetSignCount,
      normalizedFlightNumber,
      contactName,
      phoneCountryCode,
      phoneLocalNumber,
      contactEmail,
      contactNote,
    ]
  );

  function clearError() {
    if (error) {
      setError(null);
    }
  }

  function handlePhoneCountrySelect(regionCode: string, dialCode: string) {
    clearError();
    setPhoneCountryRegionCode(regionCode);
    setPhoneCountryCode(dialCode);
    setIsPhoneCountryMenuOpen(false);
    window.requestAnimationFrame(() => {
      phoneLocalInputRef.current?.focus();
    });
  }

  function saveCheckoutDraft(bookingId: string) {
    try {
      const draft: CheckoutDraft = {
        flightNumber,
        contactName,
        phoneCountryCode,
        phoneCountryRegionCode,
        phoneLocalNumber,
        contactEmail,
        contactNote,
        childSeats,
        meetAndGreetSignCount,
      };

      window.sessionStorage.setItem(getCheckoutDraftStorageKey(bookingId), JSON.stringify(draft));
    } catch {
      // sessionStorage is a convenience for returning from Stripe; checkout can continue without it.
    }
  }

  function validatePayload() {
    if (preset.tripType === "PICKUP" && !normalizedFlightNumber) {
      return labels.flightNumberRequired;
    }
    if (normalizedFlightNumber && !isValidFlightNumber(normalizedFlightNumber)) {
      return labels.flightNumberInvalid;
    }
    if (!contactName.trim()) {
      return labels.contactNameRequired;
    }
    if (!phoneCountryCode.trim()) {
      return labels.phoneCountryCodeRequired;
    }
    if (!phoneLocalNumber.trim()) {
      return labels.contactPhoneRequired;
    }
    if (getPhoneDigits(phoneLocalNumber).length < 5) {
      return labels.contactPhoneInvalid;
    }
    if (!contactEmail.trim()) {
      return labels.contactEmailRequired;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return labels.contactEmailInvalid;
    }
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <form
        className="lg:col-span-2 space-y-6"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsFlightNumberTouched(true);
          const validationError = validatePayload();
          if (validationError) {
            setError(validationError);
            return;
          }

          setLoading(true);
          try {
            const res = await fetch("/api/bookings", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? labels.orderFailed);
            if (!data?.checkoutUrl) {
              throw new Error(labels.orderFailed);
            }
            if (typeof data.bookingId === "string") {
              saveCheckoutDraft(data.bookingId);
            }
            window.location.assign(data.checkoutUrl);
          } catch (err: any) {
            setError(err?.message ?? labels.orderFailed);
          } finally {
            setLoading(false);
          }
        }}
      >
        {isPaymentCancelledReturn ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            {labels.paymentCancelledTip}
          </div>
        ) : null}

        <FormSection title={labels.transferDetails}>
          <Field label={labels.flightNumber}>
            <div className="space-y-1.5">
              <input
                className={`w-full rounded-xl border bg-white px-3 py-2 transition ${
                  isFlightNumberTouched && flightNumberInvalid
                    ? "border-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                }`}
                value={flightNumber}
                onChange={(e) => {
                  clearError();
                  setFlightNumber(normalizeFlightNumberInput(e.target.value));
                }}
                onBlur={() => {
                  setIsFlightNumberTouched(true);
                  setFlightNumber((current) => normalizeFlightNumber(current));
                }}
                placeholder={labels.placeholderFlight}
                required={preset.tripType === "PICKUP"}
                aria-invalid={isFlightNumberTouched && flightNumberInvalid}
              />
              {isFlightNumberTouched && flightNumberInvalid ? (
                <div className="text-xs font-medium text-rose-600">
                  {labels.flightNumberInvalid}
                </div>
              ) : null}
            </div>
          </Field>

          <div className="space-y-4">
            <ReadOnlyLocationField label={labels.pickupLocation} value={pickupLocation} />
            <ReadOnlyLocationField label={labels.dropoffLocation} value={dropoffLocation} />
          </div>
        </FormSection>

        <FormSection title={labels.addOns}>
          <div className="grid gap-3 md:grid-cols-2">
            <AddOnQuantityCard
              label={labels.childSeatFee}
              priceText={`${formatMoneyFromJpy(CHILD_SEAT_FEE_JPY, summary.currency, locale)} / ${labels.perSeat}`}
              icon={<ChildSeatIcon />}
              value={childSeats}
              max={2}
              limitHint={labels.childSeatLimitHint}
              onChange={(value) => {
                clearError();
                setChildSeats(value);
              }}
            />
            <AddOnQuantityCard
              label={labels.meetAndGreetFee}
              priceText={`${formatMoneyFromJpy(MEET_AND_GREET_SIGN_FEE_JPY, summary.currency, locale)} / ${labels.perOrder}`}
              icon={<MeetAndGreetIcon />}
              value={meetAndGreetSignCount}
              max={1}
              limitHint={labels.meetAndGreetLimitHint}
              onChange={(value) => {
                clearError();
                setMeetAndGreetSignCount(value);
              }}
            />
          </div>
        </FormSection>

        <FormSection title={labels.contactInformation}>
          <Field label={labels.contactName}>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={contactName}
              onChange={(e) => {
                clearError();
                setContactName(e.target.value);
              }}
              placeholder={labels.placeholderName}
              required
            />
          </Field>

          <Field label={labels.contactPhone}>
            <div
              ref={phoneFieldRef}
              className="relative overflow-visible rounded-xl border border-slate-200 bg-white transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20"
            >
              <div className="flex min-w-0 items-stretch">
                <div className="relative min-w-[116px] shrink-0 border-r border-slate-200 sm:min-w-[132px]">
                  <button
                    type="button"
                    className="flex h-full w-full items-center justify-between gap-2 bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    onClick={() => setIsPhoneCountryMenuOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={isPhoneCountryMenuOpen}
                  >
                    <span
                      className={`truncate ${
                        selectedPhoneCountryOption ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {selectedPhoneCountryOption?.displayLabel ?? labels.selectCountryCode}
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isPhoneCountryMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isPhoneCountryMenuOpen ? (
                    <div className="absolute left-0 top-full z-[110] mt-1.5 max-h-72 min-w-[260px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-xl sm:min-w-[320px]">
                      <div role="listbox" aria-label={labels.phoneCountryCode}>
                        {phoneCountryOptions.map((option) => {
                          const isSelected =
                            option.regionCode === phoneCountryRegionCode &&
                            option.dialCode === phoneCountryCode;

                          return (
                            <button
                              key={option.selectValue}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                                isSelected
                                  ? "bg-brand-600 text-white"
                                  : "text-slate-900 hover:bg-brand-50"
                              }`}
                              onClick={() =>
                                handlePhoneCountrySelect(option.regionCode, option.dialCode)
                              }
                            >
                              <span className="truncate">{option.fullLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <input
                  ref={phoneLocalInputRef}
                  type="tel"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  value={phoneLocalNumber}
                  onChange={(e) => {
                    clearError();
                    setPhoneLocalNumber(e.target.value);
                  }}
                  onFocus={() => setIsPhoneCountryMenuOpen(false)}
                  placeholder={labels.placeholderPhoneLocal || labels.placeholderPhone}
                  required
                />
              </div>
            </div>
          </Field>

          <Field label={labels.contactEmail}>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={contactEmail}
              onChange={(e) => {
                clearError();
                setContactEmail(e.target.value);
              }}
              placeholder={labels.placeholderEmail || "you@example.com"}
              required
            />
          </Field>
        </FormSection>

        <FormSection title={labels.specialRequests}>
          <Field label={labels.special}>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={contactNote}
              onChange={(e) => {
                clearError();
                setContactNote(e.target.value);
              }}
              placeholder={labels.placeholderSpecial}
            />
          </Field>
        </FormSection>

        {error ? (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          type="submit"
        >
          {loading ? labels.submitting : labels.submit}
        </button>

        <div className="text-xs text-slate-500">{labels.agree}</div>
      </form>

      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <SummarySectionHeader
                title={labels.itinerarySummary}
                toneClassName="border-brand-100 text-brand-600"
                icon={(
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 6h11M9 12h8m-8 6h11M4 6h.01M4 12h.01M4 18h.01"
                    />
                  </svg>
                )}
              />
            </div>
            <div className="p-6 space-y-4">
              <ItineraryTimeline
                pickupTime={timelinePickupTime}
                pickupLocation={pickupLocation}
                dropoffTime={timelineDropoffTime}
                dropoffLocation={dropoffLocation}
                estimateState={routeEstimateState}
                labels={labels}
              />
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <SummaryRow label={labels.tripType} value={summary.displayTripType} />
                <SummaryRow label={labels.passengers} value={String(preset.passengers)} />
                <SummaryRow label={labels.children} value={String(preset.children ?? 0)} />
                <SummaryRow label={labels.vehicle} value={summary.displayVehicle} />
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <SummarySectionHeader
                title={labels.summary}
                toneClassName="border-emerald-100 text-emerald-600"
                icon={(
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 9h18M7 14h3m2 0h5"
                    />
                  </svg>
                )}
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.basePrice}</span>
                  <span className="text-slate-900">
                    {formatMoneyFromJpy(summary.baseJpy, summary.currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.childSeatFee}</span>
                  <span className="text-slate-900">
                    {pricing.childSeatJpy > 0
                      ? `+${formatMoneyFromJpy(pricing.childSeatJpy, summary.currency, locale)}`
                      : formatMoneyFromJpy(0, summary.currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.meetAndGreetFee}</span>
                  <span className="text-slate-900">
                    {pricing.meetAndGreetJpy > 0
                      ? `+${formatMoneyFromJpy(pricing.meetAndGreetJpy, summary.currency, locale)}`
                      : formatMoneyFromJpy(0, summary.currency, locale)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">{labels.total}</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-brand-700">
                      {formatMoneyFromJpy(pricing.totalJpy, summary.currency, locale)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
