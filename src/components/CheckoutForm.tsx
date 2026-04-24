"use client";

import { useMemo, useState } from "react";
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
  childSeatFee: string;
  submit: string;
  submitting: string;
  agree: string;
  orderFailed: string;
  airportTag: string;
  placeholderFlight: string;
  placeholderFlightNote: string;
  placeholderName: string;
  placeholderPhone: string;
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
};

function Field({
  label,
  children
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

export function CheckoutForm({ preset, labels, locale = "zh" }: { preset: Preset; labels: Labels; locale?: string }) {
  const [pickupLocation, setPickupLocation] = useState(preset.tripType === "PICKUP" ? `${preset.fromArea} ${labels.airportTag}` : preset.fromArea);
  const [dropoffLocation, setDropoffLocation] = useState(preset.tripType === "DROPOFF" ? `${preset.toArea} ${labels.airportTag}` : preset.toArea);
  const [flightNumber, setFlightNumber] = useState("");
  const [flightNote, setFlightNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    if (error) {
      setError(null);
    }
  }

  const payload = useMemo(
    () => ({
      ...preset,
      pickupLocation,
      dropoffLocation,
      flightNumber: flightNumber || undefined,
      flightNote: flightNote || undefined,
      contactName,
      contactPhone,
      contactEmail,
      contactNote: contactNote || undefined,
      childSeats: preset.childSeats
    }),
    [
      preset,
      pickupLocation,
      dropoffLocation,
      flightNumber,
      flightNote,
      contactName,
      contactPhone,
      contactEmail,
      contactNote
    ]
  );

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
    if (!contactPhone.trim()) {
      return labels.contactPhoneRequired;
    }
    if (contactPhone.trim().length < 5) {
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
    <form
      className="space-y-4"
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
            body: JSON.stringify(payload)
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
        <Field label={labels.contactPhone}>
          <input
            type="tel"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            value={contactPhone}
            onChange={(e) => {
              clearError();
              setContactPhone(e.target.value);
            }}
            placeholder={labels.placeholderPhone}
            required
          />
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
      </div>

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

      <div className="text-xs text-slate-500">
        {labels.agree}
      </div>
    </form>
  );
}
