"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import type { Currency } from "@/lib/currency";
import {
  CHILD_SEAT_FEE_JPY,
  MEET_AND_GREET_SIGN_FEE_JPY,
} from "@/lib/bookingRules";
import {
  PHONE_COUNTRY_CODE_OPTIONS,
  getCompactPhoneCountryLabel,
  getFlagEmoji,
  getPhoneCountryLabel,
  getPhoneCountryName,
} from "@/lib/phoneCountryCodes";
import { LocationSelector } from "./LocationSelector";

type Preset = {
  tripType: "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
  fromArea: string;
  toArea: string;
  pickupTime: string;
  passengers: number;
  childSeats: number;
  luggageSmall: number;
  luggageMedium: number;
  luggageLarge: number;
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
  nightJpy: number;
  urgentJpy: number;
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
  vehicle: string;
  basePrice: string;
  nightFee: string;
  urgentFee: string;
  childSeatFee: string;
  meetAndGreet: string;
  meetAndGreetFee: string;
  total: string;
  paymentTip: string;
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

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function clampCount(value: string, max: number) {
  const nextValue = Number(value);
  if (Number.isNaN(nextValue)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(nextValue)));
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildContactPhone(countryCode: string, localNumber: string) {
  return `${countryCode} ${localNumber.trim().replace(/\s+/g, " ")}`.trim();
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
  const [pickupLocation, setPickupLocation] = useState(preset.defaultPickupLocation);
  const [dropoffLocation, setDropoffLocation] = useState(preset.defaultDropoffLocation);
  const [flightNumber, setFlightNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneCountryRegionCode, setPhoneCountryRegionCode] = useState("");
  const [isPhoneCountryMenuOpen, setIsPhoneCountryMenuOpen] = useState(false);
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [childSeats, setChildSeats] = useState(preset.childSeats);
  const [meetAndGreetSign, setMeetAndGreetSign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const pricing = useMemo(() => {
    const childSeatJpy = childSeats * CHILD_SEAT_FEE_JPY;
    const meetAndGreetJpy = meetAndGreetSign ? MEET_AND_GREET_SIGN_FEE_JPY : 0;
    const totalJpy =
      summary.baseJpy +
      summary.nightJpy +
      summary.urgentJpy +
      childSeatJpy +
      meetAndGreetJpy;

    return {
      childSeatJpy,
      meetAndGreetJpy,
      totalJpy,
    };
  }, [childSeats, meetAndGreetSign, summary.baseJpy, summary.nightJpy, summary.urgentJpy]);

  const payload = useMemo(
    () => ({
      tripType: preset.tripType,
      fromArea: preset.fromArea,
      toArea: preset.toArea,
      pickupTime: preset.pickupTime,
      pickupLocation,
      dropoffLocation,
      passengers: preset.passengers,
      childSeats,
      meetAndGreetSign,
      luggageSmall: preset.luggageSmall,
      luggageMedium: preset.luggageMedium,
      luggageLarge: preset.luggageLarge,
      vehicleTypeId: preset.vehicleTypeId,
      flightNumber: flightNumber.trim() || undefined,
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
      preset.luggageSmall,
      preset.luggageMedium,
      preset.luggageLarge,
      preset.vehicleTypeId,
      pickupLocation,
      dropoffLocation,
      childSeats,
      meetAndGreetSign,
      flightNumber,
      contactName,
      phoneCountryCode,
      phoneCountryRegionCode,
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

  function validatePayload() {
    if (preset.tripType === "PICKUP" && !flightNumber.trim()) {
      return labels.flightNumberRequired;
    }
    if (pickupLocation.trim().length < 2) {
      return labels.pickupLocationRequired;
    }
    if (dropoffLocation.trim().length < 2) {
      return labels.dropoffLocationRequired;
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
            window.location.assign(data.checkoutUrl);
          } catch (err: any) {
            setError(err?.message ?? labels.orderFailed);
          } finally {
            setLoading(false);
          }
        }}
      >
        <FormSection title={labels.transferDetails}>
          <Field label={labels.flightNumber}>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={flightNumber}
              onChange={(e) => {
                clearError();
                setFlightNumber(e.target.value);
              }}
              placeholder={labels.placeholderFlight}
              required={preset.tripType === "PICKUP"}
            />
          </Field>

          <LocationSelector
            value={pickupLocation}
            onChange={(value) => {
              clearError();
              setPickupLocation(value);
            }}
            label={labels.pickupLocation}
            placeholder={preset.tripType === "PICKUP" ? labels.placeholderAirport : labels.placeholderLocation}
            isAirport={preset.tripType === "PICKUP"}
            locale={locale}
            tip={labels.locationTip}
          />

          <LocationSelector
            value={dropoffLocation}
            onChange={(value) => {
              clearError();
              setDropoffLocation(value);
            }}
            label={labels.dropoffLocation}
            placeholder={preset.tripType === "DROPOFF" ? labels.placeholderAirport : labels.placeholderLocation}
            isAirport={preset.tripType === "DROPOFF"}
            locale={locale}
            tip={labels.locationTip}
          />
        </FormSection>

        <FormSection title={labels.addOns}>
          <Field label={labels.childSeatFee}>
            <div className="space-y-2">
              <input
                type="number"
                min={0}
                max={10}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={childSeats}
                onChange={(e) => {
                  clearError();
                  setChildSeats(clampCount(e.target.value, 10));
                }}
              />
              <div className="text-xs text-slate-500">
                {formatMoneyFromJpy(CHILD_SEAT_FEE_JPY, "JPY", locale)} / {labels.perSeat}
              </div>
            </div>
          </Field>

          <div className="text-sm block">
            <div className="mb-1.5 font-semibold text-slate-900">{labels.meetAndGreet}</div>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{labels.meetAndGreetFee}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatMoneyFromJpy(MEET_AND_GREET_SIGN_FEE_JPY, "JPY", locale)} / {labels.perOrder}
                </div>
              </div>
              <input
                type="checkbox"
                checked={meetAndGreetSign}
                onChange={(e) => {
                  clearError();
                  setMeetAndGreetSign(e.target.checked);
                }}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
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
              <div className="space-y-3">
                <SummaryRow label={labels.tripType} value={summary.displayTripType} />
                <SummaryRow label={labels.pickupTime} value={summary.displayPickupTime} />
                <SummaryRow label={labels.pickupLocation} value={pickupLocation} />
                <SummaryRow label={labels.dropoffLocation} value={dropoffLocation} />
                <SummaryRow label={labels.passengers} value={String(preset.passengers)} />
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
                  <span className="text-slate-500">{labels.nightFee}</span>
                  <span className="text-slate-900">
                    {summary.nightJpy > 0
                      ? `+${formatMoneyFromJpy(summary.nightJpy, summary.currency, locale)}`
                      : formatMoneyFromJpy(0, summary.currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.urgentFee}</span>
                  <span className="text-slate-900">
                    {summary.urgentJpy > 0
                      ? `+${formatMoneyFromJpy(summary.urgentJpy, summary.currency, locale)}`
                      : formatMoneyFromJpy(0, summary.currency, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {labels.childSeatFee}
                    {childSeats > 0 ? ` (${childSeats})` : ""}
                  </span>
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

          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">{labels.paymentTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
