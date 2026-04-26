"use client";

import { useMemo, useState } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import type { Currency } from "@/lib/currency";
import {
  CHILD_SEAT_FEE_JPY,
  MEET_AND_GREET_SIGN_FEE_JPY,
} from "@/lib/bookingRules";
import {
  PHONE_COUNTRY_CODE_OPTIONS,
  getPhoneCountryLabel,
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
  flightNote: string;
  pickupLocation: string;
  dropoffLocation: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  special: string;
  summary: string;
  tripType: string;
  pickupTime: string;
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
  placeholderFlightNote: string;
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
      <div className="text-slate-700 mb-1">{label}</div>
      {children}
    </label>
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
  const [flightNote, setFlightNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [childSeats, setChildSeats] = useState(preset.childSeats);
  const [meetAndGreetSign, setMeetAndGreetSign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneCountryOptions = useMemo(() => {
    const localeTag = locale.startsWith("zh") ? "zh-CN" : "en";

    return PHONE_COUNTRY_CODE_OPTIONS.map((option) => ({
      ...option,
      label: getPhoneCountryLabel(option.regionCode, option.dialCode, localeTag),
    })).sort((left, right) => left.label.localeCompare(right.label, localeTag));
  }, [locale]);

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
      flightNote: flightNote.trim() || undefined,
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
      flightNote,
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
        <div className="grid md:grid-cols-2 gap-3">
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
          <Field label={labels.flightNote}>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={flightNote}
              onChange={(e) => {
                clearError();
                setFlightNote(e.target.value);
              }}
              placeholder={labels.placeholderFlightNote}
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{labels.addOns}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              <div className="text-slate-700 mb-1">{labels.meetAndGreet}</div>
              <label className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-medium text-slate-900">{labels.meetAndGreetFee}</div>
                  <div className="text-xs text-slate-500 mt-1">
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
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
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

          <Field label={labels.phoneCountryCode}>
            <select
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={phoneCountryCode}
              onChange={(e) => {
                clearError();
                setPhoneCountryCode(e.target.value);
              }}
              required
            >
              <option value="">{labels.selectCountryCode}</option>
              {phoneCountryOptions.map((option) => (
                <option key={`${option.regionCode}-${option.dialCode}`} value={option.dialCode}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={labels.phoneLocalNumber}>
            <input
              type="tel"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              value={phoneLocalNumber}
              onChange={(e) => {
                clearError();
                setPhoneLocalNumber(e.target.value);
              }}
              placeholder={labels.placeholderPhoneLocal || labels.placeholderPhone}
              required
            />
          </Field>
        </div>

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

        <Field label={labels.special}>
          <textarea
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white min-h-24"
            value={contactNote}
            onChange={(e) => {
              clearError();
              setContactNote(e.target.value);
            }}
            placeholder={labels.placeholderSpecial}
          />
        </Field>

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
              <h2 className="font-bold text-slate-900">{labels.summary}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.tripType}</span>
                  <span className="font-medium text-slate-900">{summary.displayTripType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.pickupTime}</span>
                  <span className="font-medium text-slate-900">{summary.displayPickupTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{labels.vehicle}</span>
                  <span className="font-medium text-slate-900">{summary.displayVehicle}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
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
