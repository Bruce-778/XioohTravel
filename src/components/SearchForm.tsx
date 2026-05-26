"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { appendOptionalAddressParams, normalizeOptionalAddress } from "@/lib/locationDisplay";
import { LocationSelector, type LocationSelection } from "./LocationSelector";

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

const SEARCH_DRAFT_STORAGE_KEY = "xioohtravel.searchDraft";

type SearchDraft = {
  tripType: TripType;
  fromArea: string;
  toArea: string;
  fromAddress?: string;
  toAddress?: string;
  pickupTime: string;
  passengers: number;
  childSeats: number;
  luggageSmall: number;
  luggageMedium: number;
  luggageLarge: number;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDefaultPickupTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return formatDateTimeLocalValue(tomorrow);
}

function createDefaultSearchDraft(): SearchDraft {
  return {
    tripType: "PICKUP",
    fromArea: "NRT T1",
    toArea: "Shinjuku",
    fromAddress: undefined,
    toAddress: undefined,
    pickupTime: createDefaultPickupTime(),
    passengers: 2,
    childSeats: 0,
    luggageSmall: 1,
    luggageMedium: 0,
    luggageLarge: 0,
  };
}

function isTripType(value: unknown): value is TripType {
  return value === "PICKUP" || value === "DROPOFF" || value === "POINT_TO_POINT";
}

function parseIntegerInRange(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function hasSearchDraftParams(params: URLSearchParams) {
  return [
    "tripType",
    "fromArea",
    "toArea",
    "pickupTime",
    "passengers",
    "childSeats",
    "luggageSmall",
    "luggageMedium",
    "luggageLarge",
  ].some((key) => params.has(key));
}

function getSearchDraftFromParams(params: URLSearchParams): SearchDraft | null {
  if (!hasSearchDraftParams(params)) {
    return null;
  }

  const defaults = createDefaultSearchDraft();
  const tripTypeParam = params.get("tripType");

  return {
    tripType: isTripType(tripTypeParam) ? tripTypeParam : defaults.tripType,
    fromArea: params.get("fromArea") || defaults.fromArea,
    toArea: params.get("toArea") || defaults.toArea,
    fromAddress: normalizeOptionalAddress(params.get("fromAddress")),
    toAddress: normalizeOptionalAddress(params.get("toAddress")),
    pickupTime: params.get("pickupTime") || defaults.pickupTime,
    passengers: parseIntegerInRange(params.get("passengers"), defaults.passengers, 1, 50),
    childSeats: parseIntegerInRange(params.get("childSeats"), defaults.childSeats, 0, 10),
    luggageSmall: parseIntegerInRange(params.get("luggageSmall"), defaults.luggageSmall, 0, 20),
    luggageMedium: parseIntegerInRange(params.get("luggageMedium"), defaults.luggageMedium, 0, 20),
    luggageLarge: parseIntegerInRange(params.get("luggageLarge"), defaults.luggageLarge, 0, 20),
  };
}

function getStoredString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeStoredSearchDraft(value: Partial<SearchDraft>): SearchDraft {
  const defaults = createDefaultSearchDraft();

  return {
    tripType: isTripType(value.tripType) ? value.tripType : defaults.tripType,
    fromArea: getStoredString(value.fromArea, defaults.fromArea),
    toArea: getStoredString(value.toArea, defaults.toArea),
    fromAddress: normalizeOptionalAddress(value.fromAddress),
    toAddress: normalizeOptionalAddress(value.toAddress),
    pickupTime: getStoredString(value.pickupTime, defaults.pickupTime),
    passengers: parseIntegerInRange(value.passengers, defaults.passengers, 1, 50),
    childSeats: parseIntegerInRange(value.childSeats, defaults.childSeats, 0, 10),
    luggageSmall: parseIntegerInRange(value.luggageSmall, defaults.luggageSmall, 0, 20),
    luggageMedium: parseIntegerInRange(value.luggageMedium, defaults.luggageMedium, 0, 20),
    luggageLarge: parseIntegerInRange(value.luggageLarge, defaults.luggageLarge, 0, 20),
  };
}

function readStoredSearchDraft(): SearchDraft | null {
  try {
    const rawDraft = window.sessionStorage.getItem(SEARCH_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    return normalizeStoredSearchDraft(JSON.parse(rawDraft) as Partial<SearchDraft>);
  } catch {
    return null;
  }
}

function writeSearchDraft(draft: SearchDraft) {
  try {
    window.sessionStorage.setItem(SEARCH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Local storage is only used to make browser/back navigation friendlier.
  }
}

function buildSearchQuery(draft: SearchDraft) {
  const p = new URLSearchParams();
  p.set("tripType", draft.tripType);
  p.set("fromArea", draft.fromArea);
  p.set("toArea", draft.toArea);
  appendOptionalAddressParams(p, draft);
  p.set("pickupTime", draft.pickupTime);
  p.set("passengers", String(draft.passengers));
  p.set("childSeats", String(draft.childSeats));
  p.set("luggageSmall", String(draft.luggageSmall));
  p.set("luggageMedium", String(draft.luggageMedium));
  p.set("luggageLarge", String(draft.luggageLarge));
  return p.toString();
}

function formatDatePartValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateTimeLocalParts(value: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
  };
}

function formatDateFieldValue(datePart: string, locale: string) {
  const [year, month, day] = datePart.split("-").map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return datePart;
  }

  return new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(year, month - 1, day));
}

function getWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-GB", {
    weekday: locale.startsWith("zh") ? "narrow" : "short",
  });

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2024, 0, 7 + index))
  );
}

function getCalendarDays(viewMonth: Date) {
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - firstDayOfMonth.getDay()
  );
  const today = new Date();
  const todayKey = formatDatePartValue(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      date,
      key: formatDatePartValue(date),
      inCurrentMonth: date.getMonth() === viewMonth.getMonth(),
      isToday: formatDatePartValue(date) === todayKey,
    };
  });
}

function DateTimePicker({
  value,
  locale,
  onChange,
  ariaLabel,
}: {
  value: string;
  locale: string;
  onChange: (nextValue: string) => void;
  ariaLabel: string;
}) {
  const parsed = useMemo(() => parseDateTimeLocalParts(value), [value]);
  const datePart = value.split("T")[0] ?? "";
  const timePart = value.split("T")[1]?.slice(0, 5) ?? "10:00";
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    parsed ? new Date(parsed.year, parsed.month - 1, 1) : new Date()
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isZh = locale.startsWith("zh");
  const calendarLocale = isZh ? "zh-CN" : "en-GB";
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: isZh ? "long" : "long",
        year: "numeric",
      }).format(viewMonth),
    [calendarLocale, isZh, viewMonth]
  );

  useEffect(() => {
    if (parsed) {
      setViewMonth(new Date(parsed.year, parsed.month - 1, 1));
    }
  }, [parsed?.year, parsed?.month]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function updateDate(nextDatePart: string) {
    onChange(`${nextDatePart}T${timePart}`);
    setIsOpen(false);
  }

  function updateTime(nextTimePart: string) {
    const fallbackDate = datePart || formatDatePartValue(new Date());
    onChange(`${fallbackDate}T${nextTimePart}`);
  }

  return (
    <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
      <div ref={rootRef} className="relative min-w-0">
        <button
          type="button"
          className="input-field flex h-[52px] min-w-0 items-center justify-between gap-3 text-left"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
        >
          <span className="min-w-0 truncate text-slate-900">
            {datePart
              ? formatDateFieldValue(datePart, locale)
              : (isZh ? "选择日期" : "Select date")}
          </span>
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                aria-label={isZh ? "上个月" : "Previous month"}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-base font-semibold text-slate-900">{monthTitle}</div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                aria-label={isZh ? "下个月" : "Next month"}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
              {weekdayLabels.map((weekday) => (
                <div key={weekday} className="py-2">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isSelected = day.key === datePart;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => updateDate(day.key)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-xl text-sm transition-colors",
                      isSelected
                        ? "bg-brand-600 font-semibold text-white shadow-sm"
                        : day.inCurrentMonth
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-50",
                      day.isToday && !isSelected && "border border-brand-200 bg-brand-50/60 text-brand-700"
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <label className="block min-w-0">
        <span className="sr-only">{isZh ? "时间" : "Time"}</span>
        <input
          type="time"
          step={300}
          lang={calendarLocale}
          className="input-field block h-[52px] min-w-0 max-w-full appearance-none text-left"
          value={timePart}
          onChange={(event) => updateTime(event.target.value)}
          aria-label={`${ariaLabel} ${isZh ? "时间" : "time"}`}
        />
      </label>
    </div>
  );
}

function formatDateTimePreview(value: string, locale: string) {
  const parsed = parseDateTimeLocalParts(value);
  if (!parsed) {
    return value;
  }

  const formatted = new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: locale.startsWith("zh") ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute));

  return `${formatted} JST`;
}

export function SearchForm({ labels, locale = "zh" }: { labels?: Labels; locale?: string }) {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>("PICKUP");
  const [fromArea, setFromArea] = useState("");
  const [toArea, setToArea] = useState("");
  const [fromAddress, setFromAddress] = useState<string | undefined>();
  const [toAddress, setToAddress] = useState<string | undefined>();
  const [pickupTime, setPickupTime] = useState("");
  const [passengers, setPassengers] = useState(2);
  const [childSeats, setChildSeats] = useState(0);
  const [luggageSmall, setLuggageSmall] = useState(1);
  const [luggageMedium, setLuggageMedium] = useState(0);
  const [luggageLarge, setLuggageLarge] = useState(0);
  const [hasHydratedSearchDraft, setHasHydratedSearchDraft] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draft =
      getSearchDraftFromParams(params) ?? readStoredSearchDraft() ?? createDefaultSearchDraft();

    setTripType(draft.tripType);
    setFromArea(draft.fromArea);
    setToArea(draft.toArea);
    setFromAddress(draft.fromAddress);
    setToAddress(draft.toAddress);
    setPickupTime(draft.pickupTime);
    setPassengers(draft.passengers);
    setChildSeats(draft.childSeats);
    setLuggageSmall(draft.luggageSmall);
    setLuggageMedium(draft.luggageMedium);
    setLuggageLarge(draft.luggageLarge);
    setHasHydratedSearchDraft(true);
  }, []);

  const currentDraft = useMemo<SearchDraft>(
    () => ({
      tripType,
      fromArea,
      toArea,
      fromAddress: tripType === "PICKUP" ? undefined : fromAddress,
      toAddress: tripType === "DROPOFF" ? undefined : toAddress,
      pickupTime,
      passengers,
      childSeats,
      luggageSmall,
      luggageMedium,
      luggageLarge,
    }),
    [
      tripType,
      fromArea,
      toArea,
      fromAddress,
      toAddress,
      pickupTime,
      passengers,
      childSeats,
      luggageSmall,
      luggageMedium,
      luggageLarge,
    ]
  );

  useEffect(() => {
    if (!hasHydratedSearchDraft) {
      return;
    }

    writeSearchDraft(currentDraft);
  }, [currentDraft, hasHydratedSearchDraft]);

  const query = useMemo(() => buildSearchQuery(currentDraft), [currentDraft]);

  const tripTypeLabels: Record<TripType, string> = {
    PICKUP: labels?.pickup ?? "Pickup",
    DROPOFF: labels?.dropoff ?? "Drop-off",
    POINT_TO_POINT: labels?.p2p ?? "Point-to-point"
  };
  const childSeatsFullLabel = labels?.childSeats ?? "Child Seats";
  const childSeatsDisplayLabel = childSeatsFullLabel.replace(/\s*\(.+\)$/, "");
  const handleFromAreaChange = (nextValue: string, selection?: LocationSelection) => {
    setFromArea(nextValue);
    setFromAddress(selection?.type === "google" ? selection.displayAddress : undefined);
  };
  const handleToAreaChange = (nextValue: string, selection?: LocationSelection) => {
    setToArea(nextValue);
    setToAddress(selection?.type === "google" ? selection.displayAddress : undefined);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        writeSearchDraft(currentDraft);
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
          onChange={handleFromAreaChange}
          displayValue={tripType === "PICKUP" ? undefined : fromAddress}
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
          onChange={handleToAreaChange}
          displayValue={tripType === "DROPOFF" ? undefined : toAddress}
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

      <div className="block">
        <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {labels?.pickupTime ?? "Pickup Time"}
          <span className="ml-1 text-xs font-normal text-slate-500">(JST)</span>
        </div>
        <DateTimePicker
          value={pickupTime}
          onChange={setPickupTime}
          locale={locale}
          ariaLabel={labels?.pickupTime ?? "Pickup Time"}
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
      </div>

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
          <div
            className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
            title={childSeatsFullLabel}
          >
            {childSeatsDisplayLabel}
          </div>
          <input
            type="number"
            min={0}
            max={10}
            className="input-field"
            value={childSeats}
            onChange={(e) => setChildSeats(Number(e.target.value))}
            aria-label={childSeatsFullLabel}
          />
        </label>
        <label className="block">
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageSmall ?? "Small luggages"}</div>
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
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageMedium ?? "Medium luggages"}</div>
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
          <div className="text-sm font-medium text-slate-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{labels?.luggageLarge ?? "Large luggages"}</div>
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
