"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationSelector } from "./LocationSelector";

type TripType = "PICKUP" | "DROPOFF" | "POINT_TO_POINT";
type Labels = {
  pickup: string;
  dropoff: string;
  p2p: string;
  from: string;
  to: string;
  pickupTime: string;
  passengers: string;
  childSeats: string;
  luggageSmall: string;
  luggageMedium: string;
  luggageLarge: string;
  submit: string;
  timezoneHint?: string;
  fromAirport: string;
  fromLocation: string;
  toAirport: string;
  toLocation: string;
  selectAirport: string;
  selectLocation: string;
  placeholderAirport?: string;
  placeholderLocation?: string;
  locationTip?: string;
  locationSearching?: string;
  locationNoResults?: string;
  locationGoogleConfigError?: string;
  locationGooglePowered?: string;
  selectedTime?: string;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTimePreview(value: string, locale: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return value;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    return value;
  }

  const formatted = new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-US", {
    year: "numeric",
    month: locale.startsWith("zh") ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(year, month - 1, day, hour, minute));

  return `${formatted} JST`;
}

export function SearchForm({ labels, locale = "zh" }: { labels?: Labels; locale?: string }) {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>("PICKUP");
  const [fromArea, setFromArea] = useState("");
  const [toArea, setToArea] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  useEffect(() => {
    if (!fromArea && !toArea) {
      if (tripType === "PICKUP") {
        setFromArea("NRT T1");
        setToArea("Shinjuku");
      } else if (tripType === "DROPOFF") {
        setFromArea("Shinjuku");
        setToArea("NRT T1");
      }
    }
  }, [tripType, fromArea, toArea]);

  useEffect(() => {
    if (!pickupTime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setPickupTime(formatDateTimeLocalValue(tomorrow));
    }
  }, []);
  const [passengers, setPassengers] = useState(2);
  const [childSeats, setChildSeats] = useState(0);
  const [luggageSmall, setLuggageSmall] = useState(1);
  const [luggageMedium, setLuggageMedium] = useState(0);
  const [luggageLarge, setLuggageLarge] = useState(0);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("tripType", tripType);
    p.set("fromArea", fromArea);
    p.set("toArea", toArea);
    p.set("pickupTime", pickupTime);
    p.set("passengers", String(passengers));
    p.set("childSeats", String(childSeats));
    p.set("luggageSmall", String(luggageSmall));
    p.set("luggageMedium", String(luggageMedium));
    p.set("luggageLarge", String(luggageLarge));
    return p.toString();
  }, [tripType, fromArea, toArea, pickupTime, passengers, childSeats, luggageSmall, luggageMedium, luggageLarge]);

  const tripTypeLabels: Record<TripType, string> = {
    PICKUP: labels?.pickup ?? "Pickup",
    DROPOFF: labels?.dropoff ?? "Drop-off",
    POINT_TO_POINT: labels?.p2p ?? "Point-to-point"
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/vehicles?${query}`);
      }}
    >
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {(Object.keys(tripTypeLabels) as TripType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              t === tripType
                ? "bg-white text-brand-700 shadow-sm border border-brand-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            )}
            onClick={() => setTripType(t)}
          >
            {tripTypeLabels[t]}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <LocationSelector
          value={fromArea}
          onChange={setFromArea}
          label={tripType === "PICKUP" ? labels?.fromAirport : (tripType === "POINT_TO_POINT" ? labels?.from : labels?.fromLocation)}
          placeholder={tripType === "PICKUP" ? (labels?.placeholderAirport || labels?.selectAirport) : (labels?.placeholderLocation || labels?.selectLocation)}
          isAirport={tripType === "PICKUP"}
          locale={locale}
          tip={labels?.locationTip}
          labels={{
            searching: labels?.locationSearching || "",
            noResults: labels?.locationNoResults || "",
            googleConfigError: labels?.locationGoogleConfigError || "",
            googlePowered: labels?.locationGooglePowered || ""
          }}
        />
        <LocationSelector
          value={toArea}
          onChange={setToArea}
          label={tripType === "DROPOFF" ? labels?.toAirport : (tripType === "POINT_TO_POINT" ? labels?.to : labels?.toLocation)}
          placeholder={tripType === "DROPOFF" ? (labels?.placeholderAirport || labels?.selectAirport) : (labels?.placeholderLocation || labels?.selectLocation)}
          isAirport={tripType === "DROPOFF"}
          locale={locale}
          tip={labels?.locationTip}
          labels={{
            searching: labels?.locationSearching || "",
            noResults: labels?.locationNoResults || "",
            googleConfigError: labels?.locationGoogleConfigError || "",
            googlePowered: labels?.locationGooglePowered || ""
          }}
        />
      </div>

      <label className="block">
        <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {labels?.pickupTime ?? "Pickup Time"}
          <span className="ml-1 text-xs font-normal text-slate-500">(JST)</span>
        </div>
        <input
          type="datetime-local"
          className="input-field"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
          lang={locale.startsWith("zh") ? "zh-CN" : "en-US"}
          aria-label={labels?.pickupTime ?? "Pickup Time"}
        />
        {labels?.timezoneHint ? (
          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {labels.timezoneHint}
          </div>
        ) : null}
        {pickupTime ? (
          <div className="mt-1.5 text-xs text-slate-500">
            {(labels?.selectedTime ?? "Selected time")}: {formatDateTimePreview(pickupTime, locale)}
          </div>
        ) : null}
      </label>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.passengers ?? "Passengers"}</div>
          <input
            type="number"
            min={1}
            max={50}
            className="input-field"
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
            {labels?.childSeats ?? "Child Seats"}
          </div>
          <input
            type="number"
            min={0}
            max={10}
            className="input-field"
            value={childSeats}
            onChange={(e) => setChildSeats(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageSmall ?? "Small Luggage"}</div>
          <input
            type="number"
            min={0}
            max={20}
            className="input-field"
            value={luggageSmall}
            onChange={(e) => setLuggageSmall(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageMedium ?? "Medium Luggage"}</div>
          <input
            type="number"
            min={0}
            max={20}
            className="input-field"
            value={luggageMedium}
            onChange={(e) => setLuggageMedium(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageLarge ?? "Large Luggage"}</div>
          <input
            type="number"
            min={0}
            max={20}
            className="input-field"
            value={luggageLarge}
            onChange={(e) => setLuggageLarge(Number(e.target.value))}
          />
        </label>
      </div>

      <button
        type="submit"
        className="btn-primary w-full mt-2"
      >
        <span className="flex items-center justify-center gap-2">
          {labels?.submit ?? "Search"}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </form>
  );
}
