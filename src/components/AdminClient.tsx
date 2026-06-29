"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { LocalizedDatePicker } from "@/components/LocalizedDatePicker";
import {
  normalizePricingRouteValue,
  type PricingImportPreviewRow,
  type PricingImportPreviewSummary,
  type PricingTripType,
} from "@/lib/adminPricing";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import { formatDateTimeJST } from "@/lib/timeFormat";
import type { Currency } from "@/lib/currency";
import {
  AIRPORTS,
  POPULAR_AREAS,
  findAirportByInput,
  findAreaByInput,
  getLocalizedLocation,
} from "@/lib/locationData";

// Client-side currency helper
function getCurrencyFromCookie(): Currency {
  if (typeof document === "undefined") return "JPY";
  const cookie = document.cookie.split("; ").find((c) => c.startsWith("XioohTravel_currency="));
  const currencyFromCookie = cookie?.split("=")[1]?.toUpperCase();
  if (currencyFromCookie === "USD" || currencyFromCookie === "CNY") {
    return currencyFromCookie;
  }
  return "JPY";
}

function sortPricingRules(rules: PricingRule[]) {
  return [...rules].sort((a, b) => {
    const routeCompare = a.fromArea.localeCompare(b.fromArea) || a.toArea.localeCompare(b.toArea);
    if (routeCompare !== 0) return routeCompare;
    const tripCompare = a.tripType.localeCompare(b.tripType);
    if (tripCompare !== 0) return tripCompare;
    const aSeats = a.vehicleType.seats ?? 0;
    const bSeats = b.vehicleType.seats ?? 0;
    if (aSeats !== bSeats) return aSeats - bSeats;
    return a.vehicleType.name.localeCompare(b.vehicleType.name);
  });
}

function sortPricingOverrides(overrides: PricingOverride[]) {
  return [...overrides].sort((a, b) => {
    const timeCompare = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (timeCompare !== 0) return timeCompare;
    const routeCompare = a.fromArea.localeCompare(b.fromArea) || a.toArea.localeCompare(b.toArea);
    if (routeCompare !== 0) return routeCompare;
    const tripCompare = a.tripType.localeCompare(b.tripType);
    if (tripCompare !== 0) return tripCompare;
    const aSeats = a.vehicleType.seats ?? 0;
    const bSeats = b.vehicleType.seats ?? 0;
    if (aSeats !== bSeats) return aSeats - bSeats;
    return a.vehicleType.name.localeCompare(b.vehicleType.name);
  });
}

type AdminRow = {
  id: string;
  createdAt: string;
  tripType: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  fromTo: string;
  flightNumber: string | null;
  flightNote: string | null;
  vehicleName: string | null;
  vehicleTypeId: string | null;
  passengers: number;
  childSeats: number;
  meetAndGreetSign: boolean;
  luggageSmall: number;
  luggageMedium: number;
  luggageLarge: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactNote: string | null;
  status: string;
  isUrgent: boolean;
  pricingBaseJpy: number;
  pricingNightJpy: number;
  pricingUrgentJpy: number;
  pricingChildSeatJpy: number;
  pricingMeetAndGreetJpy: number;
  totalJpy: number;
  pricingManualAdjustmentJpy: number;
  pricingNote: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  stripePaymentFeeJpy: number | null;
  stripeRefundId: string | null;
  stripeRefundStatus: string | null;
  refundAmountJpy: number | null;
  refundFeeDeductedJpy: number | null;
  refundRequestedAt: string | null;
  refundedAt: string | null;
  refundFailureReason: string | null;
  refundConfirmationEmailSentAt: string | null;
  refundConfirmationEmailProviderId: string | null;
  merchantOrderEmailSentAt: string | null;
  merchantOrderEmailProviderId: string | null;
  merchantRefundEmailSentAt: string | null;
  merchantRefundEmailProviderId: string | null;
};
type PricingRule = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fromArea: string;
  toArea: string;
  tripType: string;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
  vehicleType: {
    id: string;
    name: string;
    seats?: number;
  };
};

type PricingOverride = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fromArea: string;
  toArea: string;
  tripType: string;
  vehicleTypeId: string;
  startsAt: string;
  endsAt: string;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
  note: string | null;
  enabled: boolean;
  vehicleType: {
    id: string;
    name: string;
    seats?: number;
  };
};

type VehicleType = {
  id: string;
  name: string;
  seats: number;
};

type PricingRuleFormState = {
  fromArea: string;
  toArea: string;
  tripType: PricingTripType;
  vehicleTypeId: string;
  basePriceJpy: number;
  nightFeeJpy: number;
  urgentFeeJpy: number;
};

type PricingOverrideFormState = PricingRuleFormState & {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  note: string;
  enabled: boolean;
};

type PricingLocationMode = "suggested" | "custom";
type PricingRouteModeState = {
  from: PricingLocationMode;
  to: PricingLocationMode;
};

type PricingFilterState = {
  keyword: string;
  fromArea: string;
  toArea: string;
  tripType: string;
  vehicleTypeId: string;
};

type PricingImportPreviewErrorRow = {
  rowNumber: number;
  field: string;
  reason: string;
};

type PricingImportPreviewState = {
  fileName: string;
  rows: PricingImportPreviewRow[];
  errors: PricingImportPreviewErrorRow[];
  summary: PricingImportPreviewSummary;
};

const EMPTY_PRICING_FILTERS: PricingFilterState = {
  keyword: "",
  fromArea: "",
  toArea: "",
  tripType: "",
  vehicleTypeId: "",
};

type AdminAccessStatus = "checking" | "unauthenticated" | "forbidden" | "requires_secret" | "verified";

type Labels = {
  loginTitle: string;
  loginSubtitle: string;
  loginRequiredTitle: string;
  loginRequiredText: string;
  loginAction: string;
  forbiddenTitle: string;
  forbiddenText: string;
  enter: string;
  loading: string;
  orders: string;
  edit: string;
  editTitle: string;
  status: string;
  manualAdjustment: string;
  note: string;
  save: string;
  saving: string;
  id: string;
  pickupTime: string;
  route: string;
  vehicle: string;
  amount: string;
  action: string;
  empty: string;
  adjustmentHint: string;
  notePlaceholder: string;
  loginPlaceholder: string;
  showSecret: string;
  hideSecret: string;
  urgentTag: string;
  close: string;
  details: string;
  hideDetails: string;
  tripSection: string;
  passengersSection: string;
  contactSection: string;
  pricingSection: string;
  timelineSection: string;
  export: string;
  dateType: string;
  dateRange: string;
  dateTypeCreated: string;
  dateTypePickup: string;
  today: string;
  yesterday: string;
  thisMonth: string;
  all: string;
  filter: string;
  orderIdSearch: string;
  orderIdPlaceholder: string;
  statuses: Record<string, string>;
  vehicles: Record<string, string>;
  pricing: string;
  pricingTitle: string;
  pricingSubtitle: string;
  addRule: string;
  editRule: string;
  deleteRule: string;
  pricingOverrides: string;
  pricingOverridesSubtitle: string;
  pricingOverridesMigrationRequired: string;
  pricingOverridesMigrationCommand: string;
  addOverride: string;
  editOverride: string;
  noOverrides: string;
  overrideStartAt: string;
  overrideEndAt: string;
  overrideEnabled: string;
  overrideNote: string;
  overrideNotePlaceholder: string;
  overrideConflict: string;
  overrideFormRequired: string;
  overrideInvalidPeriod: string;
  specialPeriod: string;
  enabled: string;
  disabled: string;
  fromArea: string;
  toArea: string;
  tripType: string;
  basePrice: string;
  nightFee: string;
  urgentFee: string;
  vehicleType: string;
  create: string;
  creating: string;
  update: string;
  updating: string;
  cancel: string;
  delete: string;
  deleting: string;
  confirmDelete: string;
  deleteConfirmText: string;
  noRules: string;
  fromAreaPlaceholder: string;
  toAreaPlaceholder: string;
  tabsOrders: string;
  tabsPricing: string;
  tripTypes: {
    PICKUP: string;
    DROPOFF: string;
    POINT_TO_POINT: string;
  };
  page: string;
  pageOf: string;
  previous: string;
  next: string;
  itemsPerPage: string;
  startDate: string;
  endDate: string;
  customDateRange: string;
  pickupLocation: string;
  dropoffLocation: string;
  flightNumber: string;
  flightNote: string;
  passengersCount: string;
  childSeats: string;
  meetAndGreet: string;
  luggageSmall: string;
  luggageMedium: string;
  luggageLarge: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactNote: string;
  pricingBase: string;
  pricingNight: string;
  pricingUrgent: string;
  pricingChildSeat: string;
  pricingMeetAndGreet: string;
  pricingManualAdjustment: string;
  pricingNoteValue: string;
  createdAt: string;
  cancelledAt: string;
  cancelReasonValue: string;
  refundStatus: string;
  refundAmount: string;
  refundFeeDeducted: string;
  refundRequestedAt: string;
  refundedAt: string;
  refundReference: string;
  refundFailureReason: string;
  refundEmailSentAt: string;
  refundEmailProvider: string;
  merchantOrderEmailSentAt: string;
  merchantOrderEmailProvider: string;
  merchantRefundEmailSentAt: string;
  merchantRefundEmailProvider: string;
  refundNotRequired: string;
  refundPending: string;
  refundSucceeded: string;
  refundFailed: string;
  notProvided: string;
  yes: string;
  no: string;
  pricingRuleNotFound: string;
  vehicleTypeNotFound: string;
  loadFailed: string;
  saveFailed: string;
  deleteFailed: string;
  exportFailed: string;
  loadVehiclesFailed: string;
  verified: string;
  itemsPerPageSuffix: string;
  selectVehicle: string;
  pricingLockedHint: string;
  searchRoute: string;
  resetFilters: string;
  allTripTypes: string;
  allVehicleTypes: string;
  noPricingResults: string;
  importCsv: string;
  downloadTemplate: string;
  suggested: string;
  custom: string;
  selectKnownLocation: string;
  customLocationHint: string;
  routeSectionTitle: string;
  tripVehicleSection: string;
  pricingSectionTitle: string;
  importTitle: string;
  importSubtitle: string;
  importPreview: string;
  importSummary: string;
  confirmImport: string;
  importPreviewing: string;
  importing: string;
  importRows: string;
  importErrors: string;
  importValidRows: string;
  importInvalidRows: string;
  importCreateCount: string;
  importUpdateCount: string;
  importFileRequired: string;
  importCompleted: string;
  rowNumber: string;
  reason: string;
  notesLabel: string;
  willCreate: string;
  willUpdate: string;
  importNoValidRows: string;
  chooseFile: string;
  importCustomLocationNote: string;
  importErrorMissingValue: string;
  importErrorInvalidTripType: string;
  importErrorInvalidPrice: string;
  importErrorUnknownVehicleType: string;
  importErrorDuplicateInFile: string;
  importErrorMissingColumn: string;
  fileName: string;
  noErrorsFound: string;
  duplicate: string;
  updatedAtLabel: string;
  recentlyUpdated: string;
  clearFilter: string;
  unsavedChangesTitle: string;
  unsavedChangesText: string;
};

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-500 text-white";
    case "PENDING_PAYMENT":
      return "bg-amber-500 text-white";
    case "CANCELLED":
      return "bg-red-500 text-white";
    case "COMPLETED":
      return "bg-slate-700 text-white";
    default:
      return "bg-blue-500 text-white";
  }
}

function serializePricingRuleSnapshot(
  form: PricingRuleFormState,
  routeMode: PricingRouteModeState
) {
  return JSON.stringify({ form, routeMode });
}

function serializePricingOverrideSnapshot(
  form: PricingOverrideFormState,
  routeMode: PricingRouteModeState
) {
  return JSON.stringify({ form, routeMode });
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getJstDateTimeParts(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    time: `${getPart("hour")}:${getPart("minute")}`,
  };
}

function buildJstIsoString(datePart: string, timePart: string) {
  if (!datePart) {
    return "";
  }

  const safeTime = timePart || "00:00";
  const parsed = new Date(`${datePart}T${safeTime}:00+09:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function createDefaultOverridePeriod() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startDate = `${jstNow.getUTCFullYear()}-${padDatePart(jstNow.getUTCMonth() + 1)}-${padDatePart(
    jstNow.getUTCDate() + 1
  )}`;
  const endDateValue = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 2));
  const endDate = `${endDateValue.getUTCFullYear()}-${padDatePart(endDateValue.getUTCMonth() + 1)}-${padDatePart(
    endDateValue.getUTCDate()
  )}`;

  return {
    startDate,
    startTime: "00:00",
    endDate,
    endTime: "00:00",
  };
}

export function AdminClient({ labels, locale = "zh-CN" }: { labels: Labels; locale?: string }) {
  const [token, setToken] = useState("");
  const [adminAccessStatus, setAdminAccessStatus] = useState<AdminAccessStatus>("checking");
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [deletingOverrideId, setDeletingOverrideId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [activeTab, setActiveTab] = useState<"orders" | "pricing">("orders");
  
  // Order pagination
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderItemsPerPage, setOrderItemsPerPage] = useState(10);

  // Filters
  const [dateType, setDateType] = useState<"createdAt" | "pickupTime">("createdAt");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [orderIdSearch, setOrderIdSearch] = useState<string>("");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  
  // Order pagination calculations
  const orderTotalPages = Math.ceil(rows.length / orderItemsPerPage);
  const orderStartIndex = (orderCurrentPage - 1) * orderItemsPerPage;
  const orderEndIndex = orderStartIndex + orderItemsPerPage;
  const paginatedOrders = rows.slice(orderStartIndex, orderEndIndex);
  
  // Reset to page 1 when rows change
  useEffect(() => {
    setOrderCurrentPage(1);
  }, [rows.length]);
  const [status, setStatus] = useState<string>("CONFIRMED");
  const [manualAdjustmentJpy, setManualAdjustmentJpy] = useState<number>(0);
  const [pricingNote, setPricingNote] = useState<string>("");

  // Pricing management
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverride[]>([]);
  const [pricingOverridesMigrationRequired, setPricingOverridesMigrationRequired] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pricingKeyword, setPricingKeyword] = useState("");
  const [pricingFromArea, setPricingFromArea] = useState("");
  const [pricingToArea, setPricingToArea] = useState("");
  const [pricingTripType, setPricingTripType] = useState("");
  const [pricingVehicleTypeId, setPricingVehicleTypeId] = useState("");
  const [appliedPricingFilters, setAppliedPricingFilters] = useState<PricingFilterState>(EMPTY_PRICING_FILTERS);
  const [routeMode, setRouteMode] = useState<PricingRouteModeState>({
    from: "suggested",
    to: "suggested",
  });
  const [overrideRouteMode, setOverrideRouteMode] = useState<PricingRouteModeState>({
    from: "suggested",
    to: "suggested",
  });
  const [importPreview, setImportPreview] = useState<PricingImportPreviewState | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ruleFormInitialSnapshot, setRuleFormInitialSnapshot] = useState("");
  const [overrideFormInitialSnapshot, setOverrideFormInitialSnapshot] = useState("");
  const pricingFileInputRef = useRef<HTMLInputElement | null>(null);
  const isZh = locale.startsWith("zh");
  const dateTimeLocale = isZh ? "zh-CN" : "en-GB";

  function getBlankRuleForm(): PricingRuleFormState {
    return {
      fromArea: "",
      toArea: "",
      tripType: "PICKUP",
      vehicleTypeId: "",
      basePriceJpy: 0,
      nightFeeJpy: 0,
      urgentFeeJpy: 0,
    };
  }

  const [ruleForm, setRuleForm] = useState<PricingRuleFormState>(getBlankRuleForm());

  function getBlankOverrideForm(): PricingOverrideFormState {
    const defaultPeriod = createDefaultOverridePeriod();
    return {
      ...getBlankRuleForm(),
      ...defaultPeriod,
      note: "",
      enabled: true,
    };
  }

  const [overrideForm, setOverrideForm] = useState<PricingOverrideFormState>(getBlankOverrideForm());

  const pricingLocationOptions = useMemo(() => {
    const airportOptions = AIRPORTS.map((airport) => ({
      value: airport.code,
      label: `${isZh ? airport.name.zh : airport.name.en} (${airport.code})`,
    }));

    const areaOptions = POPULAR_AREAS.map((area) => ({
      value: area.code,
      label: `${isZh ? area.name.zh : area.name.en} (${area.code})`,
    }));

    return [...airportOptions, ...areaOptions];
  }, [isZh]);

  const knownPricingLocationValues = useMemo(
    () => new Set(pricingLocationOptions.map((option) => option.value.toLowerCase())),
    [pricingLocationOptions]
  );

  const hasActivePricingFilters = useMemo(
    () =>
      [
        appliedPricingFilters.keyword,
        appliedPricingFilters.fromArea,
        appliedPricingFilters.toArea,
        appliedPricingFilters.tripType,
        appliedPricingFilters.vehicleTypeId,
      ].some((value) => value.trim() !== ""),
    [appliedPricingFilters]
  );

  function getDraftPricingFilters(): PricingFilterState {
    return {
      keyword: pricingKeyword,
      fromArea: pricingFromArea,
      toArea: pricingToArea,
      tripType: pricingTripType,
      vehicleTypeId: pricingVehicleTypeId,
    };
  }

  function getServerPricingFilters(filters: PricingFilterState) {
    return {
      keyword: filters.keyword.trim(),
      fromArea: filters.fromArea.trim(),
      toArea: filters.toArea.trim(),
      tripType: filters.tripType.trim(),
      vehicleTypeId: filters.vehicleTypeId.trim(),
    };
  }

  function syncPricingFilterInputs(filters: PricingFilterState) {
    setPricingKeyword(filters.keyword);
    setPricingFromArea(filters.fromArea);
    setPricingToArea(filters.toArea);
    setPricingTripType(filters.tripType);
    setPricingVehicleTypeId(filters.vehicleTypeId);
  }

  function getDefaultRuleForm(filters: PricingFilterState = appliedPricingFilters): PricingRuleFormState {
    const defaults = getBlankRuleForm();
    if (filters.fromArea.trim()) {
      defaults.fromArea = normalizePricingRouteValue(filters.fromArea) || filters.fromArea.trim();
    }
    if (filters.toArea.trim()) {
      defaults.toArea = normalizePricingRouteValue(filters.toArea) || filters.toArea.trim();
    }
    if (filters.tripType.trim()) {
      defaults.tripType = filters.tripType as PricingTripType;
    }
    if (filters.vehicleTypeId.trim()) {
      defaults.vehicleTypeId = filters.vehicleTypeId.trim();
    }
    return defaults;
  }

  function getDefaultOverrideForm(filters: PricingFilterState = appliedPricingFilters): PricingOverrideFormState {
    const defaults = getBlankOverrideForm();
    const ruleDefaults = getDefaultRuleForm(filters);
    return {
      ...defaults,
      ...ruleDefaults,
    };
  }

  function isSuggestedLocationValue(value: string) {
    const normalized = normalizePricingRouteValue(value).toLowerCase();
    return knownPricingLocationValues.has(normalized);
  }

  function getRouteModeForForm(form: PricingRuleFormState): PricingRouteModeState {
    return {
      from: form.fromArea && !isSuggestedLocationValue(form.fromArea) ? "custom" : "suggested",
      to: form.toArea && !isSuggestedLocationValue(form.toArea) ? "custom" : "suggested",
    };
  }

  function getRouteModeForOverrideForm(form: PricingOverrideFormState): PricingRouteModeState {
    return {
      from: form.fromArea && !isSuggestedLocationValue(form.fromArea) ? "custom" : "suggested",
      to: form.toArea && !isSuggestedLocationValue(form.toArea) ? "custom" : "suggested",
    };
  }

  function closePricingRuleForm() {
    setEditingRuleId(null);
    setShowRuleForm(false);
    setRuleForm(getBlankRuleForm());
    setRouteMode({ from: "suggested", to: "suggested" });
    setRuleFormInitialSnapshot("");
  }

  function attemptClosePricingRuleForm() {
    if (pricingSaving) {
      return;
    }

    const currentSnapshot = serializePricingRuleSnapshot(ruleForm, routeMode);
    if (ruleFormInitialSnapshot && currentSnapshot !== ruleFormInitialSnapshot) {
      const shouldDiscard = window.confirm(
        `${labels.unsavedChangesTitle}\n\n${labels.unsavedChangesText}`
      );
      if (!shouldDiscard) {
        return;
      }
    }

    closePricingRuleForm();
  }

  function openPricingRuleForm(
    form: PricingRuleFormState,
    nextEditingRuleId: string | null
  ) {
    const nextRouteMode = getRouteModeForForm(form);
    setEditingRuleId(nextEditingRuleId);
    setRuleForm(form);
    setRouteMode(nextRouteMode);
    setRuleFormInitialSnapshot(serializePricingRuleSnapshot(form, nextRouteMode));
    setShowRuleForm(true);
  }

  function openCreatePricingRule(prefill?: PricingRuleFormState) {
    openPricingRuleForm(prefill ? { ...prefill } : getDefaultRuleForm(), null);
  }

  function openEditPricingRule(rule: PricingRule) {
    openPricingRuleForm(
      {
        fromArea: rule.fromArea,
        toArea: rule.toArea,
        tripType: rule.tripType as PricingTripType,
        vehicleTypeId: rule.vehicleType.id,
        basePriceJpy: rule.basePriceJpy,
        nightFeeJpy: rule.nightFeeJpy,
        urgentFeeJpy: rule.urgentFeeJpy,
      },
      rule.id
    );
  }

  function closePricingOverrideForm() {
    setEditingOverrideId(null);
    setShowOverrideForm(false);
    setOverrideForm(getBlankOverrideForm());
    setOverrideRouteMode({ from: "suggested", to: "suggested" });
    setOverrideFormInitialSnapshot("");
  }

  function attemptClosePricingOverrideForm() {
    if (pricingSaving) {
      return;
    }

    const currentSnapshot = serializePricingOverrideSnapshot(overrideForm, overrideRouteMode);
    if (overrideFormInitialSnapshot && currentSnapshot !== overrideFormInitialSnapshot) {
      const shouldDiscard = window.confirm(
        `${labels.unsavedChangesTitle}\n\n${labels.unsavedChangesText}`
      );
      if (!shouldDiscard) {
        return;
      }
    }

    closePricingOverrideForm();
  }

  function openPricingOverrideForm(
    form: PricingOverrideFormState,
    nextEditingOverrideId: string | null
  ) {
    const nextRouteMode = getRouteModeForOverrideForm(form);
    setEditingOverrideId(nextEditingOverrideId);
    setOverrideForm(form);
    setOverrideRouteMode(nextRouteMode);
    setOverrideFormInitialSnapshot(serializePricingOverrideSnapshot(form, nextRouteMode));
    setShowOverrideForm(true);
  }

  function openCreatePricingOverride(prefill?: Partial<PricingOverrideFormState>) {
    openPricingOverrideForm({ ...getDefaultOverrideForm(), ...prefill }, null);
  }

  function openCreatePricingOverrideFromRule(rule: PricingRule) {
    openCreatePricingOverride({
      fromArea: rule.fromArea,
      toArea: rule.toArea,
      tripType: rule.tripType as PricingTripType,
      vehicleTypeId: rule.vehicleType.id,
      basePriceJpy: rule.basePriceJpy,
      nightFeeJpy: rule.nightFeeJpy,
      urgentFeeJpy: rule.urgentFeeJpy,
    });
  }

  function openEditPricingOverride(override: PricingOverride) {
    const startParts = getJstDateTimeParts(override.startsAt);
    const endParts = getJstDateTimeParts(override.endsAt);
    openPricingOverrideForm(
      {
        fromArea: override.fromArea,
        toArea: override.toArea,
        tripType: override.tripType as PricingTripType,
        vehicleTypeId: override.vehicleType.id,
        startDate: startParts.date,
        startTime: startParts.time,
        endDate: endParts.date,
        endTime: endParts.time,
        basePriceJpy: override.basePriceJpy,
        nightFeeJpy: override.nightFeeJpy,
        urgentFeeJpy: override.urgentFeeJpy,
        note: override.note ?? "",
        enabled: override.enabled,
      },
      override.id
    );
  }

  function getPricingDisplayValue(value: string) {
    const airport = findAirportByInput(value);
    if (airport) {
      const airportName = isZh ? airport.name.zh : airport.name.en;
      return `${airportName} (${airport.code})`;
    }

    const area = findAreaByInput(value);
    if (area) {
      return isZh ? area.name.zh : area.name.en;
    }

    return getLocalizedLocation(value, locale);
  }

  function getTripTypeLabel(value: string) {
    return labels.tripTypes[value as keyof typeof labels.tripTypes] || value;
  }

  const activePricingFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof PricingFilterState; label: string }> = [];

    if (appliedPricingFilters.keyword.trim()) {
      chips.push({
        key: "keyword",
        label: `${labels.searchRoute}: ${appliedPricingFilters.keyword.trim()}`,
      });
    }

    if (appliedPricingFilters.fromArea.trim()) {
      chips.push({
        key: "fromArea",
        label: `${labels.fromArea}: ${getPricingDisplayValue(appliedPricingFilters.fromArea.trim())}`,
      });
    }

    if (appliedPricingFilters.toArea.trim()) {
      chips.push({
        key: "toArea",
        label: `${labels.toArea}: ${getPricingDisplayValue(appliedPricingFilters.toArea.trim())}`,
      });
    }

    if (appliedPricingFilters.tripType.trim()) {
      chips.push({
        key: "tripType",
        label: `${labels.tripType}: ${getTripTypeLabel(appliedPricingFilters.tripType.trim())}`,
      });
    }

    if (appliedPricingFilters.vehicleTypeId.trim()) {
      const vehicle = vehicleTypes.find((item) => item.id === appliedPricingFilters.vehicleTypeId.trim());
      const vehicleLabel = vehicle ? labels.vehicles[vehicle.name] || vehicle.name : appliedPricingFilters.vehicleTypeId.trim();
      chips.push({
        key: "vehicleTypeId",
        label: `${labels.vehicleType}: ${vehicleLabel}`,
      });
    }

    return chips;
  }, [appliedPricingFilters, labels.fromArea, labels.searchRoute, labels.toArea, labels.tripType, labels.vehicleType, vehicleTypes]);

  const totalPages = Math.ceil(pricingRules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRules = pricingRules.slice(startIndex, endIndex);
  const isPricingLocked = editingRow ? editingRow.status !== "PENDING_PAYMENT" : false;

  useEffect(() => {
    setCurrency(getCurrencyFromCookie());
    
    // Listen for currency changes via custom event
    const handleCurrencyChange = () => {
      setCurrency(getCurrencyFromCookie());
    };
    
    window.addEventListener('currencyChanged', handleCurrencyChange);
    
    // Also check periodically (fallback)
    const interval = setInterval(() => {
      const currentCurrency = getCurrencyFromCookie();
      setCurrency((prev) => {
        if (currentCurrency !== prev) {
          return currentCurrency;
        }
        return prev;
      });
    }, 500);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (currentPage > Math.max(totalPages, 1)) {
      setCurrentPage(Math.max(totalPages, 1));
    }
  }, [currentPage, totalPages]);

  // Admin secret verification
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/verify-secret", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setToken("verified");
          setAdminAccessStatus("verified");
          load();
          return;
        }

        setToken("");
        if (data?.status === "forbidden") {
          setAdminAccessStatus("forbidden");
        } else if (data?.status === "requires_secret") {
          setAdminAccessStatus("requires_secret");
        } else {
          setAdminAccessStatus("unauthenticated");
        }
      } catch {
        setToken("");
        setAdminAccessStatus("unauthenticated");
      } finally {
        setIsChecking(false);
      }
    };
    checkAdmin();
  }, []);

  function getFilterDates() {
    // Start and end work independently: start-only means "from this date
    // onwards", end-only means "everything up to this date".
    const start = startDate ? new Date(`${startDate}T${startTime || "00:00"}`) : null;
    const end = endDate ? new Date(`${endDate}T${endTime || "23:59"}`) : null;
    return {
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    };
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getFilterDates();
      const params = new URLSearchParams();
      params.append("dateType", dateType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      const normalizedOrderId = orderIdSearch.trim();
      if (normalizedOrderId) params.append("orderId", normalizedOrderId);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setRows(data.rows ?? []);
      setOrderCurrentPage(1);
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  function renderDetailValue(value: string | null | undefined) {
    if (!value || value.trim() === "") {
      return labels.notProvided;
    }

    return value;
  }

  function getRefundStatusLabel(status: string | null | undefined) {
    switch (status) {
      case "not_required":
        return labels.refundNotRequired;
      case "succeeded":
        return labels.refundSucceeded;
      case "failed":
      case "canceled":
        return labels.refundFailed;
      case "pending":
      case "requires_action":
      default:
        return status ? labels.refundPending : labels.notProvided;
    }
  }

  async function exportOrders() {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getFilterDates();
      const params = new URLSearchParams();
      params.append("dateType", dateType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      const normalizedOrderId = orderIdSearch.trim();
      if (normalizedOrderId) params.append("orderId", normalizedOrderId);

      const res = await fetch(`/api/admin/orders/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? labels.exportFailed);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      setError(e?.message ?? labels.exportFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!editingRow) return;
    setStatus(editingRow.status);
    setManualAdjustmentJpy(editingRow.pricingManualAdjustmentJpy);
    setPricingNote(editingRow.pricingNote ?? "");
  }, [editingRow]);

  async function save() {
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: editingId,
          status,
          manualAdjustmentJpy,
          pricingNote
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.saveFailed);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? labels.saveFailed);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles() {
    try {
      const res = await fetch("/api/admin/vehicles", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setVehicleTypes(data.vehicles ?? []);
    } catch (e: any) {
      setError(e?.message ?? labels.loadVehiclesFailed);
    }
  }

  async function loadPricingRules(
    filters = getServerPricingFilters(appliedPricingFilters),
    options?: { resetPage?: boolean; appliedFilters?: PricingFilterState }
  ) {
    setPricingLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.keyword) params.append("q", filters.keyword);
      if (filters.fromArea) params.append("fromArea", filters.fromArea);
      if (filters.toArea) params.append("toArea", filters.toArea);
      if (filters.tripType) params.append("tripType", filters.tripType);
      if (filters.vehicleTypeId) params.append("vehicleTypeId", filters.vehicleTypeId);

      const res = await fetch(`/api/admin/pricing?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setPricingRules(sortPricingRules(data.rules ?? []));
      if (options?.appliedFilters) {
        setAppliedPricingFilters(options.appliedFilters);
      }
      if (options?.resetPage) {
        setCurrentPage(1);
      }
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    } finally {
      setPricingLoading(false);
    }
  }

  async function loadPricingOverrides(filters = getServerPricingFilters(appliedPricingFilters)) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.keyword) params.append("q", filters.keyword);
      if (filters.fromArea) params.append("fromArea", filters.fromArea);
      if (filters.toArea) params.append("toArea", filters.toArea);
      if (filters.tripType) params.append("tripType", filters.tripType);
      if (filters.vehicleTypeId) params.append("vehicleTypeId", filters.vehicleTypeId);

      const res = await fetch(`/api/admin/pricing-overrides?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data?.migrationRequired) {
        setPricingOverridesMigrationRequired(true);
        setPricingOverrides([]);
        return;
      }
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setPricingOverridesMigrationRequired(false);
      setPricingOverrides(sortPricingOverrides(data.overrides ?? []));
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    }
  }

  async function applyPricingFilters(nextFilters: PricingFilterState = getDraftPricingFilters()) {
    const normalizedFilters: PricingFilterState = {
      keyword: nextFilters.keyword.trim(),
      fromArea: nextFilters.fromArea.trim(),
      toArea: nextFilters.toArea.trim(),
      tripType: nextFilters.tripType.trim(),
      vehicleTypeId: nextFilters.vehicleTypeId.trim(),
    };

    syncPricingFilterInputs(normalizedFilters);
    await Promise.all([
      loadPricingRules(getServerPricingFilters(normalizedFilters), {
        resetPage: true,
        appliedFilters: normalizedFilters,
      }),
      loadPricingOverrides(getServerPricingFilters(normalizedFilters)),
    ]);
  }

  async function resetPricingFilters() {
    syncPricingFilterInputs(EMPTY_PRICING_FILTERS);
    await Promise.all([
      loadPricingRules(getServerPricingFilters(EMPTY_PRICING_FILTERS), {
        resetPage: true,
        appliedFilters: EMPTY_PRICING_FILTERS,
      }),
      loadPricingOverrides(getServerPricingFilters(EMPTY_PRICING_FILTERS)),
    ]);
  }

  async function clearPricingFilterChip(key: keyof PricingFilterState) {
    const nextFilters: PricingFilterState = {
      ...appliedPricingFilters,
      [key]: "",
    };

    syncPricingFilterInputs(nextFilters);
    await Promise.all([
      loadPricingRules(getServerPricingFilters(nextFilters), {
        resetPage: true,
        appliedFilters: nextFilters,
      }),
      loadPricingOverrides(getServerPricingFilters(nextFilters)),
    ]);
  }

  async function savePricingRule() {
    setPricingSaving(true);
    setError(null);
    try {
      const method = editingRuleId ? "PUT" : "POST";
      const body = editingRuleId ? { id: editingRuleId, ...ruleForm } : ruleForm;

      const res = await fetch("/api/admin/pricing", {
        method,
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.saveFailed);

      await loadPricingRules(getServerPricingFilters(appliedPricingFilters));
      closePricingRuleForm();
    } catch (e: any) {
      setError(e?.message ?? labels.saveFailed);
    } finally {
      setPricingSaving(false);
    }
  }

  async function deletePricingRule(id: string) {
    if (!confirm(labels.deleteConfirmText)) return;
    setDeletingRuleId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pricing?id=${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.deleteFailed);
      await loadPricingRules(getServerPricingFilters(appliedPricingFilters));
    } catch (e: any) {
      setError(e?.message ?? labels.deleteFailed);
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function savePricingOverride() {
    setPricingSaving(true);
    setError(null);
    try {
      const startsAt = buildJstIsoString(overrideForm.startDate, overrideForm.startTime);
      const endsAt = buildJstIsoString(overrideForm.endDate, overrideForm.endTime);
      if (
        !overrideForm.fromArea.trim() ||
        !overrideForm.toArea.trim() ||
        !overrideForm.tripType ||
        !overrideForm.vehicleTypeId.trim() ||
        !startsAt ||
        !endsAt ||
        !Number.isFinite(overrideForm.basePriceJpy) ||
        overrideForm.basePriceJpy < 0
      ) {
        throw new Error(labels.overrideFormRequired);
      }

      if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
        throw new Error(labels.overrideInvalidPeriod);
      }

      const method = editingOverrideId ? "PUT" : "POST";
      const body = {
        ...(editingOverrideId ? { id: editingOverrideId } : {}),
        fromArea: overrideForm.fromArea,
        toArea: overrideForm.toArea,
        tripType: overrideForm.tripType,
        vehicleTypeId: overrideForm.vehicleTypeId,
        startsAt,
        endsAt,
        basePriceJpy: overrideForm.basePriceJpy,
        nightFeeJpy: overrideForm.nightFeeJpy,
        urgentFeeJpy: overrideForm.urgentFeeJpy,
        note: overrideForm.note,
        enabled: overrideForm.enabled,
      };

      const res = await fetch("/api/admin/pricing-overrides", {
        method,
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.migrationRequired) {
        setPricingOverridesMigrationRequired(true);
      }
      if (!res.ok) throw new Error(data?.error ?? labels.saveFailed);
      setPricingOverridesMigrationRequired(false);

      await loadPricingOverrides(getServerPricingFilters(appliedPricingFilters));
      closePricingOverrideForm();
    } catch (e: any) {
      setError(e?.message ?? labels.saveFailed);
    } finally {
      setPricingSaving(false);
    }
  }

  async function deletePricingOverride(id: string) {
    if (!confirm(labels.deleteConfirmText)) return;
    setDeletingOverrideId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pricing-overrides?id=${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (data?.migrationRequired) {
        setPricingOverridesMigrationRequired(true);
      }
      if (!res.ok) throw new Error(data?.error ?? labels.deleteFailed);
      setPricingOverridesMigrationRequired(false);
      await loadPricingOverrides(getServerPricingFilters(appliedPricingFilters));
    } catch (e: any) {
      setError(e?.message ?? labels.deleteFailed);
    } finally {
      setDeletingOverrideId(null);
    }
  }

  useEffect(() => {
    if (token && activeTab === "pricing") {
      syncPricingFilterInputs(appliedPricingFilters);
      void Promise.all([
        loadVehicles(),
        loadPricingRules(getServerPricingFilters(appliedPricingFilters), {
          resetPage: true,
          appliedFilters: appliedPricingFilters,
        }),
        loadPricingOverrides(getServerPricingFilters(appliedPricingFilters)),
      ]);
    }
  }, [activeTab, token]);

  async function downloadPricingTemplate() {
    setError(null);
    try {
      window.location.assign("/api/admin/pricing/import/template");
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    }
  }

  async function handlePricingImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setError(labels.importFileRequired);
      return;
    }

    setImportLoading(true);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/pricing/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);

      setImportPreview({
        fileName: file.name,
        rows: data.rows ?? [],
        errors: data.errors ?? [],
        summary: data.summary,
      });
      setShowImportModal(true);
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    } finally {
      setImportLoading(false);
      event.target.value = "";
    }
  }

  async function commitPricingImport() {
    if (!importPreview) return;
    setImportSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/pricing/import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: importPreview.rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);

      await loadPricingRules(getServerPricingFilters(appliedPricingFilters), {
        resetPage: true,
        appliedFilters: appliedPricingFilters,
      });
      setShowImportModal(false);
      setImportPreview(null);
      setNotice(labels.importCompleted);
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    } finally {
      setImportSubmitting(false);
    }
  }

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRuleForm) {
          attemptClosePricingRuleForm();
        }
        if (showOverrideForm) {
          attemptClosePricingOverrideForm();
        }
        if (showImportModal) {
          setShowImportModal(false);
        }
        if (editingRow) {
          setEditingId(null);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [
    editingRow,
    showImportModal,
    showOverrideForm,
    showRuleForm,
    ruleForm,
    routeMode,
    ruleFormInitialSnapshot,
    overrideForm,
    overrideRouteMode,
    overrideFormInitialSnapshot,
    pricingSaving,
  ]);

  async function handleLogin() {
    const trimmedToken = token.trim();
    if (!trimmedToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ secret: trimmedToken })
      });
      if (res.ok) {
        setToken("verified");
        setAdminAccessStatus("verified");
        if (activeTab === "orders") {
          void load();
        } else {
          syncPricingFilterInputs(appliedPricingFilters);
          void Promise.all([
            loadVehicles(),
            loadPricingRules(getServerPricingFilters(appliedPricingFilters), {
              resetPage: true,
              appliedFilters: appliedPricingFilters,
            }),
            loadPricingOverrides(getServerPricingFilters(appliedPricingFilters)),
          ]);
        }
      } else {
        const data = await res.json();
        if (data?.status === "unauthenticated") {
          setAdminAccessStatus("unauthenticated");
        }
        if (data?.status === "forbidden") {
          setAdminAccessStatus("forbidden");
        }
        throw new Error(data.error || "Invalid secret");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pricingToolbarButtonClass =
    "inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60";
  const pricingToolbarPrimaryButtonClass =
    "inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-2xl border border-brand-300 bg-brand-100 px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-sm shadow-brand-100/60 transition hover:border-brand-400 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60";
  const pricingFilterFieldClass =
    "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

  if (isChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (adminAccessStatus === "unauthenticated") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-100">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-10 w-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">{labels.loginRequiredTitle}</h2>
          <p className="mb-8 text-slate-500">{labels.loginRequiredText}</p>
          <a
            href="/login?next=%2Fadmin"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-xl shadow-brand-200 transition-all hover:bg-brand-700 active:scale-[0.98]"
          >
            {labels.loginAction}
          </a>
        </div>
      </div>
    );
  }

  if (adminAccessStatus === "forbidden") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-100">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50">
            <svg className="h-10 w-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M5.07 19h13.86A2 2 0 0020.66 16L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">{labels.forbiddenTitle}</h2>
          <p className="text-slate-500">{labels.forbiddenText}</p>
        </div>
      </div>
    );
  }

  if (token !== "verified") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-100 mb-8 text-center">
          <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{labels.loginTitle}</h2>
          <p className="text-slate-500 mb-8">{labels.loginSubtitle}</p>
          
          <div className="relative mb-6">
            <input
                type={showAdminSecret ? "text" : "password"}
              value={token === "verified" ? "" : token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={labels.loginPlaceholder}
                className="w-full rounded-2xl border-2 border-slate-200 px-6 py-4 pr-16 text-center font-mono text-lg tracking-widest outline-none transition-all focus:border-brand-500"
              />
              <button
                type="button"
                aria-label={showAdminSecret ? labels.hideSecret : labels.showSecret}
                title={showAdminSecret ? labels.hideSecret : labels.showSecret}
                onClick={() => setShowAdminSecret((value) => !value)}
                className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {showAdminSecret ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 4.24A10.49 10.49 0 0112 4c5.52 0 9.39 4.26 10.5 8a11.73 11.73 0 01-2.17 3.68M6.11 6.11C3.82 7.53 2.28 9.72 1.5 12c1.11 3.74 4.98 8 10.5 8a10.4 10.4 0 005.01-1.26" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12s3.75-7 9.75-7 9.75 7 9.75 7-3.75 7-9.75 7-9.75-7-9.75-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                )}
              </button>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading || token === "verified" || !token.trim()}
            className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-brand-200"
          >
            {loading ? labels.loading : labels.enter}
          </button>
        </div>

        {error && (
          <div className="max-w-md w-full p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Tabs */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200">
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "orders"
                ? "text-brand-700 border-b-2 border-brand-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {labels.tabsOrders}
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "pricing"
                ? "text-brand-700 border-b-2 border-brand-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {labels.tabsPricing}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {activeTab === "orders" ? (
      <>
      <div className="p-5 rounded-2xl bg-white border border-slate-200">
        <div className="font-semibold">{labels.orders}</div>
        
        {/* Filter Controls - Optimized Adaptive Layout */}
        <div className="mt-4 flex flex-wrap items-end gap-3 w-full">
          {/* Date Type - Fixed narrow width */}
          <div className="w-[140px] flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1.5">{labels.dateType}</div>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
              value={dateType}
              onChange={(e) => setDateType(e.target.value as any)}
            >
              <option value="createdAt">{labels.dateTypeCreated}</option>
              <option value="pickupTime">{labels.dateTypePickup}</option>
            </select>
          </div>
          
          {/* Start Date & Time - Compact Layout */}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs text-slate-500 mb-1.5">{labels.startDate}</div>
            <div className="flex min-w-0 gap-2">
              <LocalizedDatePicker
                className="flex-[1.5] min-w-[140px]"
                buttonClassName="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={startDate}
                onChange={setStartDate}
                locale={locale}
                ariaLabel={labels.startDate}
              />
              <input
                type="time"
                className="w-[120px] flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                lang={dateTimeLocale}
              />
            </div>
          </div>
          
          {/* End Date & Time - Compact Layout */}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs text-slate-500 mb-1.5">{labels.endDate}</div>
            <div className="flex min-w-0 gap-2">
              <LocalizedDatePicker
                className="flex-[1.5] min-w-[140px]"
                buttonClassName="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={endDate}
                onChange={setEndDate}
                locale={locale}
                ariaLabel={labels.endDate}
                minDate={startDate}
              />
              <input
                type="time"
                className="w-[120px] flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                lang={dateTimeLocale}
              />
            </div>
          </div>

          {/* Order ID Search */}
          <div className="w-[190px] flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1.5">{labels.orderIdSearch}</div>
            <input
              type="search"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  load();
                }
              }}
              placeholder={labels.orderIdPlaceholder}
            />
          </div>
          
          {/* Status - Fixed narrow width */}
          <div className="w-[120px] flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1.5">{labels.status}</div>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">{labels.all}</option>
              {Object.entries(labels.statuses).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          
          {/* Filter Button */}
          <div className="flex-shrink-0">
            <button
              onClick={load}
              disabled={loading || !token}
              className="px-4 py-2 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-60 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {labels.filter}
            </button>
          </div>
          
          {/* Export Button */}
          <div className="flex-shrink-0">
            <button
              onClick={exportOrders}
              disabled={loading || !token}
              className="px-4 py-2 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-60 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {labels.export}
            </button>
          </div>
        </div>

        <div className="mt-6">
          {rows.length === 0 ? (
            <div className="py-16 text-slate-500 text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <div className="text-lg mb-2">{labels.empty}</div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedOrders.map((r) => {
                  const displayVehicle = r.vehicleName
                    ? labels.vehicles[r.vehicleName] || r.vehicleName
                    : labels.notProvided;
                  const displayStatus = labels.statuses[r.status] || r.status;
                  const displayTripType = labels.tripTypes[r.tripType as keyof typeof labels.tripTypes] || r.tripType;
                  const isExpanded = expandedBookingId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="group relative bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      {/* Accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="p-5">
                        <div className="flex items-start gap-6">
                          {/* Left Section - Main Info */}
                          <div className="flex-1 min-w-0">
                            {/* Top Row - ID, Time, Status */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex items-center gap-4 flex-wrap">
                                {/* Order ID */}
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                  <div>
                                    <div className="text-xs font-medium text-slate-400 mb-0.5">{labels.id}</div>
                                    <div className="font-mono text-sm font-bold text-slate-900">{r.id}</div>
                                  </div>
                                </div>
                                
                                <div className="h-6 w-px bg-slate-200"></div>
                                
                                {/* Pickup Time */}
                                <div>
                                  <div className="text-xs font-medium text-slate-400 mb-0.5">{labels.pickupTime}</div>
                                  <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                                    {formatDateTimeJST(r.pickupTime, locale)}
                                  </div>
                                </div>
                                
                                {r.isUrgent && (
                                  <>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md">
                                      ⚡ {labels.urgentTag}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {/* Status Badge */}
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap ${getStatusBadgeClass(r.status)}`}>
                                {displayStatus}
                              </span>
                            </div>
                            
                            {/* Bottom Row - Route and Vehicle */}
                            <div className="flex items-center gap-6 flex-wrap">
                              {/* Route */}
                              <div className="flex-1 min-w-[250px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <div className="text-xs font-medium text-slate-400">{labels.route}</div>
                                </div>
                                <div className="text-base font-semibold text-slate-900 truncate" title={r.fromTo}>
                                  {r.fromTo}
                                </div>
                              </div>
                              
                              <div className="h-8 w-px bg-slate-200"></div>
                              
                              {/* Vehicle */}
                              <div className="min-w-[140px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  <div className="text-xs font-medium text-slate-400">{labels.vehicle}</div>
                                </div>
                                <div className="text-base font-semibold text-slate-900 whitespace-nowrap">
                                  {displayVehicle}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Section - Amount and Action */}
                          <div className="flex flex-col items-end gap-3 flex-shrink-0">
                            {/* Amount */}
                            <div className="text-right">
                              <div className="text-xs font-medium text-slate-400 mb-1">{labels.amount}</div>
                              <div className="text-2xl font-bold text-brand-600">
                                {formatMoneyFromJpy(r.totalJpy, currency, locale)}
                              </div>
                              {r.pricingManualAdjustmentJpy !== 0 && (
                                <div className={`text-xs font-semibold mt-1.5 px-2 py-0.5 rounded ${
                                  r.pricingManualAdjustmentJpy > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                                }`}>
                                  {r.pricingManualAdjustmentJpy > 0 ? '+' : ''}{formatMoneyFromJpy(r.pricingManualAdjustmentJpy, currency, locale)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                className="px-4 py-2.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-60 transition-colors text-sm font-semibold whitespace-nowrap"
                                onClick={() => setExpandedBookingId(isExpanded ? null : r.id)}
                              >
                                {isExpanded ? labels.hideDetails : labels.details}
                              </button>
                              <button
                                className="px-5 py-2.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-60 transition-colors text-sm font-semibold whitespace-nowrap"
                                onClick={() => setEditingId(r.id)}
                              >
                                {labels.edit}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="mt-5 border-t border-slate-200 pt-5">
                            <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="text-sm font-semibold text-slate-900 mb-3">{labels.tripSection}</div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.tripType}</div>
                                    <div className="font-medium text-slate-900">{displayTripType}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pickupTime}</div>
                                    <div className="font-medium text-slate-900">{formatDateTimeJST(r.pickupTime, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pickupLocation}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.pickupLocation)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.dropoffLocation}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.dropoffLocation)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.flightNumber}</div>
                                    <div className="font-medium text-slate-900">{renderDetailValue(r.flightNumber)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.flightNote}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.flightNote)}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="text-sm font-semibold text-slate-900 mb-3">{labels.passengersSection}</div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.passengersCount}</div>
                                    <div className="font-medium text-slate-900">{r.passengers}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.childSeats}</div>
                                    <div className="font-medium text-slate-900">{r.childSeats}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.meetAndGreet}</div>
                                    <div className="font-medium text-slate-900">{r.meetAndGreetSign ? labels.yes : labels.no}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.luggageSmall}</div>
                                    <div className="font-medium text-slate-900">{r.luggageSmall}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.luggageMedium}</div>
                                    <div className="font-medium text-slate-900">{r.luggageMedium}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.luggageLarge}</div>
                                    <div className="font-medium text-slate-900">{r.luggageLarge}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.urgentTag}</div>
                                    <div className="font-medium text-slate-900">{r.isUrgent ? labels.urgentTag : labels.notProvided}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="text-sm font-semibold text-slate-900 mb-3">{labels.contactSection}</div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.contactName}</div>
                                    <div className="font-medium text-slate-900">{renderDetailValue(r.contactName)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.contactPhone}</div>
                                    <div className="font-medium text-slate-900">{renderDetailValue(r.contactPhone)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.contactEmail}</div>
                                    <div className="font-medium text-slate-900 break-all">{renderDetailValue(r.contactEmail)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.contactNote}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.contactNote)}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="text-sm font-semibold text-slate-900 mb-3">{labels.pricingSection}</div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingBase}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingBaseJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingNight}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingNightJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingUrgent}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingUrgentJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingChildSeat}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingChildSeatJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingMeetAndGreet}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingMeetAndGreetJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingManualAdjustment}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.pricingManualAdjustmentJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.amount}</div>
                                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(r.totalJpy, currency, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.pricingNoteValue}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.pricingNote)}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="text-sm font-semibold text-slate-900 mb-3">{labels.timelineSection}</div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.createdAt}</div>
                                    <div className="font-medium text-slate-900">{formatDateTimeJST(r.createdAt, locale)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.status}</div>
                                    <div className="font-medium text-slate-900">{displayStatus}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.cancelledAt}</div>
                                    <div className="font-medium text-slate-900">{r.cancelledAt ? formatDateTimeJST(r.cancelledAt, locale) : labels.notProvided}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.cancelReasonValue}</div>
                                    <div className="font-medium text-slate-900 break-words">{renderDetailValue(r.cancelReason)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundStatus}</div>
                                    <div className="font-medium text-slate-900">{getRefundStatusLabel(r.stripeRefundStatus)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundAmount}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.refundAmountJpy ? formatMoneyFromJpy(r.refundAmountJpy, currency, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundFeeDeducted}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.refundFeeDeductedJpy != null
                                        ? formatMoneyFromJpy(r.refundFeeDeductedJpy, currency, locale)
                                        : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundRequestedAt}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.refundRequestedAt ? formatDateTimeJST(r.refundRequestedAt, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundedAt}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.refundedAt ? formatDateTimeJST(r.refundedAt, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundReference}</div>
                                    <div className="font-medium text-slate-900 break-all">{renderDetailValue(r.stripeRefundId)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundFailureReason}</div>
                                    <div className="font-medium text-rose-700 break-words">{renderDetailValue(r.refundFailureReason)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundEmailSentAt}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.refundConfirmationEmailSentAt ? formatDateTimeJST(r.refundConfirmationEmailSentAt, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.refundEmailProvider}</div>
                                    <div className="font-medium text-slate-900 break-all">{renderDetailValue(r.refundConfirmationEmailProviderId)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.merchantOrderEmailSentAt}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.merchantOrderEmailSentAt ? formatDateTimeJST(r.merchantOrderEmailSentAt, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.merchantOrderEmailProvider}</div>
                                    <div className="font-medium text-slate-900 break-all">{renderDetailValue(r.merchantOrderEmailProviderId)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.merchantRefundEmailSentAt}</div>
                                    <div className="font-medium text-slate-900">
                                      {r.merchantRefundEmailSentAt ? formatDateTimeJST(r.merchantRefundEmailSentAt, locale) : labels.notProvided}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500">{labels.merchantRefundEmailProvider}</div>
                                    <div className="font-medium text-slate-900 break-all">{renderDetailValue(r.merchantRefundEmailProviderId)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              {rows.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    {labels.pageOf
                      ?.replace("{total}", String(rows.length))
                      .replace("{current}", String(orderCurrentPage))
                      .replace("{totalPages}", String(orderTotalPages))}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={orderItemsPerPage}
                      onChange={(e) => {
                        setOrderItemsPerPage(Number(e.target.value));
                        setOrderCurrentPage(1);
                      }}
                    >
                      <option value={5}>5 {labels.itemsPerPageSuffix}</option>
                      <option value={10}>10 {labels.itemsPerPageSuffix}</option>
                      <option value={20}>20 {labels.itemsPerPageSuffix}</option>
                      <option value={50}>50 {labels.itemsPerPageSuffix}</option>
                    </select>
                    <button
                      className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      onClick={() => setOrderCurrentPage(p => Math.max(1, p - 1))}
                      disabled={orderCurrentPage === 1}
                    >
                      {labels.previous}
                    </button>
                    <span className="px-4 py-1.5 text-sm font-medium text-slate-700">
                      {orderCurrentPage} / {orderTotalPages}
                    </span>
                    <button
                      className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      onClick={() => setOrderCurrentPage(p => Math.min(orderTotalPages, p + 1))}
                      disabled={orderCurrentPage === orderTotalPages}
                    >
                      {labels.next}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Order Modal */}
      {editingRow ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingId(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="font-semibold text-lg mb-2">{labels.editTitle}</div>
              <div className="text-sm text-slate-600 mb-6 pb-4 border-b border-slate-200 space-y-3">
                <div className="font-mono text-xs text-slate-500">{editingRow.id}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{editingRow.contactName}（{editingRow.contactEmail}）</span>
                  {editingRow.isUrgent ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      {labels.urgentTag}
                    </span>
                  ) : null}
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">{labels.pickupTime}</div>
                    <div className="font-medium text-slate-900">{formatDateTimeJST(editingRow.pickupTime, locale)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">{labels.route}</div>
                    <div className="font-medium text-slate-900 break-words">{editingRow.fromTo}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">{labels.amount}</div>
                    <div className="font-medium text-slate-900">{formatMoneyFromJpy(editingRow.totalJpy, currency, locale)}</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm block">
                  <div className="text-slate-700 mb-2 font-medium">{labels.status}</div>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {Object.entries(labels.statuses).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm block">
                  <div className="text-slate-700 mb-2 font-medium">{labels.manualAdjustment}</div>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    value={manualAdjustmentJpy}
                    onChange={(e) => setManualAdjustmentJpy(Number(e.target.value))}
                    placeholder="0"
                    disabled={isPricingLocked}
                  />
                  <div className="text-xs text-slate-500 mt-1.5">
                    {isPricingLocked ? labels.pricingLockedHint : labels.adjustmentHint}
                  </div>
                </label>

                <label className="text-sm block md:col-span-2">
                  <div className="text-slate-700 mb-2 font-medium">{labels.note}</div>
                  <textarea
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none"
                    rows={3}
                    value={pricingNote}
                    onChange={(e) => setPricingNote(e.target.value)}
                    placeholder={labels.notePlaceholder}
                  />
                </label>
              </div>

              <div className="mt-6 flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-sm font-medium transition-colors"
                disabled={loading}
                onClick={() => setEditingId(null)}
              >
                {labels.cancel}
              </button>
                <button
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 text-sm font-medium transition-colors"
                disabled={loading}
                onClick={save}
              >
                {loading ? labels.saving : labels.save}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
      ) : (
        <>
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.32)] sm:p-6">
            <div>
              <div className="text-lg font-semibold text-slate-900">{labels.pricingTitle}</div>
              <div className="mt-1 text-sm text-slate-600">{labels.pricingSubtitle}</div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)]">
              <div className="bg-gradient-to-r from-slate-50 via-white to-brand-50/35 px-5 py-5 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_repeat(4,minmax(0,1fr))]">
                  <label className="block text-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{labels.searchRoute}</div>
                    <input
                      className={pricingFilterFieldClass}
                      value={pricingKeyword}
                      onChange={(e) => setPricingKeyword(e.target.value)}
                      placeholder={labels.searchRoute}
                    />
                  </label>

                  <label className="block text-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{labels.fromArea}</div>
                    <input
                      className={pricingFilterFieldClass}
                      value={pricingFromArea}
                      onChange={(e) => setPricingFromArea(e.target.value)}
                      placeholder={labels.fromAreaPlaceholder}
                    />
                  </label>

                  <label className="block text-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{labels.toArea}</div>
                    <input
                      className={pricingFilterFieldClass}
                      value={pricingToArea}
                      onChange={(e) => setPricingToArea(e.target.value)}
                      placeholder={labels.toAreaPlaceholder}
                    />
                  </label>

                  <label className="block text-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{labels.tripType}</div>
                    <select
                      className={pricingFilterFieldClass}
                      value={pricingTripType}
                      onChange={(e) => setPricingTripType(e.target.value)}
                    >
                      <option value="">{labels.allTripTypes}</option>
                      <option value="PICKUP">{labels.tripTypes.PICKUP}</option>
                      <option value="DROPOFF">{labels.tripTypes.DROPOFF}</option>
                      <option value="POINT_TO_POINT">{labels.tripTypes.POINT_TO_POINT}</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-500">{labels.vehicleType}</div>
                    <select
                      className={pricingFilterFieldClass}
                      value={pricingVehicleTypeId}
                      onChange={(e) => setPricingVehicleTypeId(e.target.value)}
                    >
                      <option value="">{labels.allVehicleTypes}</option>
                      {vehicleTypes.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {labels.vehicles[vehicle.name] || vehicle.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => void applyPricingFilters()}
                      disabled={pricingLoading || pricingSaving || importLoading}
                      className={pricingToolbarButtonClass}
                    >
                      {labels.filter}
                    </button>
                    <button
                      onClick={() => void resetPricingFilters()}
                      disabled={pricingLoading || pricingSaving || importLoading}
                      className={pricingToolbarButtonClass}
                    >
                      {labels.resetFilters}
                    </button>
                  </div>

                  <input
                    ref={pricingFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => void handlePricingImportFileChange(e)}
                  />

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <button
                      onClick={() => void downloadPricingTemplate()}
                      disabled={pricingLoading || importLoading || pricingSaving}
                      className={pricingToolbarButtonClass}
                    >
                      {labels.downloadTemplate}
                    </button>

                    <button
                      onClick={() => pricingFileInputRef.current?.click()}
                      disabled={pricingLoading || importLoading || pricingSaving}
                      className={pricingToolbarButtonClass}
                    >
                      {importLoading ? labels.importPreviewing : labels.importCsv}
                    </button>

                    <button
                      onClick={() => openCreatePricingRule()}
                      disabled={pricingLoading || importLoading || pricingSaving}
                      className={pricingToolbarPrimaryButtonClass}
                    >
                      {labels.addRule}
                    </button>

                  </div>
                </div>
              </div>

              {activePricingFilterChips.length > 0 ? (
                <div className="border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    {activePricingFilterChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => void clearPricingFilterChip(chip.key)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        aria-label={`${labels.clearFilter}: ${chip.label}`}
                      >
                        <span>{chip.label}</span>
                        <span aria-hidden className="text-sm leading-none">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[1020px] w-full text-sm">
                    <thead className="bg-slate-50/90 text-left text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="w-[30%] min-w-[230px] px-4 py-4 text-left text-xs font-semibold tracking-[0.06em]">{labels.route}</th>
                        <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.tripType}</th>
                        <th className="w-[150px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.vehicleType}</th>
                        <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.basePrice}</th>
                        <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.nightFee}</th>
                        <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.urgentFee}</th>
                        <th className="sticky right-0 z-10 w-[230px] whitespace-nowrap bg-slate-50 px-4 py-4 text-center text-xs font-semibold tracking-[0.06em] shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.18)]">{labels.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedRules.length === 0 ? (
                        <tr>
                          <td className="px-5 py-16 text-center text-slate-500" colSpan={7}>
                            {pricingLoading
                              ? labels.loading
                              : hasActivePricingFilters
                                ? labels.noPricingResults
                                : labels.noRules}
                          </td>
                        </tr>
                      ) : (
                        paginatedRules.map((rule) => (
                          <tr key={rule.id} className="align-middle transition hover:bg-brand-50/30">
                            <td className="px-4 py-5">
                              <div className="font-semibold leading-6 text-slate-900">
                                {getPricingDisplayValue(rule.fromArea)} {"->"} {getPricingDisplayValue(rule.toArea)}
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">
                                {rule.fromArea} {"->"} {rule.toArea}
                              </div>
                            </td>
                            <td className="px-3 py-5 text-center align-middle">
                              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {getTripTypeLabel(rule.tripType)}
                              </span>
                            </td>
                            <td className="px-3 py-5 text-center align-middle">
                              <span className="inline-flex whitespace-nowrap rounded-full border border-brand-100 bg-brand-50/80 px-2.5 py-1 text-xs font-medium text-brand-700">
                                {labels.vehicles[rule.vehicleType.name] || rule.vehicleType.name}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                              {formatMoneyFromJpy(rule.basePriceJpy, currency, locale)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                              {formatMoneyFromJpy(rule.nightFeeJpy, currency, locale)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                              {formatMoneyFromJpy(rule.urgentFeeJpy, currency, locale)}
                            </td>
                            <td className="sticky right-0 z-10 bg-white px-4 py-5 align-middle shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.18)]">
                              <div className="flex flex-nowrap justify-center gap-2 whitespace-nowrap">
                                <button
                                  className="whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                                  onClick={() => openCreatePricingOverrideFromRule(rule)}
                                  disabled={pricingSaving || deletingRuleId !== null}
                                >
                                  {labels.specialPeriod}
                                </button>
                                <button
                                  className="whitespace-nowrap rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
                                  onClick={() => openEditPricingRule(rule)}
                                  disabled={pricingSaving || deletingRuleId !== null}
                                >
                                  {labels.edit}
                                </button>
                                <button
                                  className="whitespace-nowrap rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                                  onClick={() => void deletePricingRule(rule.id)}
                                  disabled={pricingSaving || deletingRuleId !== null}
                                >
                                  {deletingRuleId === rule.id ? labels.deleting : labels.delete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {pricingRules.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-600">
                    {labels.pageOf
                      .replace("{total}", String(pricingRules.length))
                      .replace("{current}", String(currentPage))
                      .replace("{totalPages}", String(totalPages))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10 {labels.itemsPerPageSuffix}</option>
                      <option value={20}>20 {labels.itemsPerPageSuffix}</option>
                      <option value={50}>50 {labels.itemsPerPageSuffix}</option>
                      <option value={100}>100 {labels.itemsPerPageSuffix}</option>
                    </select>
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      {labels.previous}
                    </button>
                    <span className="px-3 py-2 text-sm font-medium text-slate-600">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {labels.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-amber-100 bg-white p-5 shadow-[0_28px_80px_-48px_rgba(146,64,14,0.28)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">{labels.pricingOverrides}</div>
                <div className="mt-1 text-sm text-slate-600">{labels.pricingOverridesSubtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => openCreatePricingOverride()}
                disabled={pricingLoading || pricingSaving || pricingOverridesMigrationRequired}
                className={pricingToolbarPrimaryButtonClass}
              >
                {labels.addOverride}
              </button>
            </div>

            {pricingOverridesMigrationRequired ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                <div className="font-semibold">{labels.pricingOverridesMigrationRequired}</div>
                <div className="mt-1 text-xs font-medium text-amber-800">
                  {labels.pricingOverridesMigrationCommand}:{" "}
                  <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-amber-900">
                    npm run patch:pricing-overrides
                  </code>
                </div>
              </div>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.25)]">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="bg-amber-50/70 text-left text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="w-[230px] px-4 py-4 text-left text-xs font-semibold tracking-[0.06em]">{labels.route}</th>
                      <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.tripType}</th>
                      <th className="w-[150px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.vehicleType}</th>
                      <th className="w-[220px] whitespace-nowrap px-3 py-4 text-left text-xs font-semibold tracking-[0.06em]">{labels.specialPeriod}</th>
                      <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.basePrice}</th>
                      <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.nightFee}</th>
                      <th className="w-[110px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.urgentFee}</th>
                      <th className="w-[100px] whitespace-nowrap px-3 py-4 text-center text-xs font-semibold tracking-[0.06em]">{labels.overrideEnabled}</th>
                      <th className="w-[160px] px-3 py-4 text-left text-xs font-semibold tracking-[0.06em]">{labels.overrideNote}</th>
                      <th className="sticky right-0 z-10 w-[160px] whitespace-nowrap bg-amber-50 px-4 py-4 text-center text-xs font-semibold tracking-[0.06em] shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.18)]">{labels.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pricingOverrides.length === 0 ? (
                      <tr>
                        <td className="px-5 py-14 text-center text-slate-500" colSpan={10}>
                          {pricingLoading
                            ? labels.loading
                            : pricingOverridesMigrationRequired
                              ? labels.pricingOverridesMigrationRequired
                              : labels.noOverrides}
                        </td>
                      </tr>
                    ) : (
                      pricingOverrides.map((override) => (
                        <tr key={override.id} className="align-middle transition hover:bg-amber-50/35">
                          <td className="px-4 py-5">
                            <div className="font-semibold leading-6 text-slate-900">
                              {getPricingDisplayValue(override.fromArea)} {"->"} {getPricingDisplayValue(override.toArea)}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {override.fromArea} {"->"} {override.toArea}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-center align-middle">
                            <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {getTripTypeLabel(override.tripType)}
                            </span>
                          </td>
                          <td className="px-3 py-5 text-center align-middle">
                            <span className="inline-flex whitespace-nowrap rounded-full border border-brand-100 bg-brand-50/80 px-2.5 py-1 text-xs font-medium text-brand-700">
                              {labels.vehicles[override.vehicleType.name] || override.vehicleType.name}
                            </span>
                          </td>
                          <td className="px-3 py-5 align-middle text-slate-700">
                            <div className="font-medium">{formatDateTimeJST(override.startsAt, locale)}</div>
                            <div className="mt-1 text-xs text-slate-500">→ {formatDateTimeJST(override.endsAt, locale)}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                            {formatMoneyFromJpy(override.basePriceJpy, currency, locale)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                            {formatMoneyFromJpy(override.nightFeeJpy, currency, locale)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-center align-middle font-semibold tabular-nums text-slate-900">
                            {formatMoneyFromJpy(override.urgentFeeJpy, currency, locale)}
                          </td>
                          <td className="px-3 py-5 text-center align-middle">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                override.enabled
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              {override.enabled ? labels.enabled : labels.disabled}
                            </span>
                          </td>
                          <td className="px-3 py-5 align-middle text-slate-600">
                            <div className="max-w-[150px] truncate" title={override.note ?? labels.notProvided}>
                              {override.note || labels.notProvided}
                            </div>
                          </td>
                          <td className="sticky right-0 z-10 bg-white px-4 py-5 align-middle shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.18)]">
                            <div className="flex flex-nowrap justify-center gap-2 whitespace-nowrap">
                              <button
                                className="whitespace-nowrap rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
                                onClick={() => openEditPricingOverride(override)}
                                disabled={pricingSaving || deletingOverrideId !== null}
                              >
                                {labels.edit}
                              </button>
                              <button
                                className="whitespace-nowrap rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                                onClick={() => void deletePricingOverride(override.id)}
                                disabled={pricingSaving || deletingOverrideId !== null}
                              >
                                {deletingOverrideId === override.id ? labels.deleting : labels.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {showRuleForm ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  attemptClosePricingRuleForm();
                }
              }}
            >
              <div
                className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_36px_120px_-56px_rgba(15,23,42,0.45)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/40 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {editingRuleId ? labels.editRule : labels.addRule}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{labels.pricingSubtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={attemptClosePricingRuleForm}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      aria-label={labels.close}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.routeSectionTitle}</div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">{labels.fromArea}</div>
                            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  routeMode.from === "suggested"
                                    ? "bg-brand-100 text-brand-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                                onClick={() => {
                                  setRouteMode((prev) => ({ ...prev, from: "suggested" }));
                                  if (ruleForm.fromArea && !isSuggestedLocationValue(ruleForm.fromArea)) {
                                    setRuleForm((prev) => ({ ...prev, fromArea: "" }));
                                  }
                                }}
                              >
                                {labels.suggested}
                              </button>
                              <button
                                type="button"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  routeMode.from === "custom"
                                    ? "bg-brand-100 text-brand-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                                onClick={() => setRouteMode((prev) => ({ ...prev, from: "custom" }))}
                              >
                                {labels.custom}
                              </button>
                            </div>
                          </div>

                          {routeMode.from === "suggested" ? (
                            <select
                              className={pricingFilterFieldClass}
                              value={isSuggestedLocationValue(ruleForm.fromArea) ? normalizePricingRouteValue(ruleForm.fromArea) : ""}
                              onChange={(e) => setRuleForm((prev) => ({ ...prev, fromArea: e.target.value }))}
                            >
                              <option value="">{labels.selectKnownLocation}</option>
                              {pricingLocationOptions.map((option) => (
                                <option key={`from-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <input
                                className={pricingFilterFieldClass}
                                value={ruleForm.fromArea}
                                onChange={(e) => setRuleForm((prev) => ({ ...prev, fromArea: e.target.value }))}
                                placeholder={labels.fromAreaPlaceholder}
                              />
                              <div className="mt-2 text-xs text-slate-500">{labels.customLocationHint}</div>
                            </>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">{labels.toArea}</div>
                            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  routeMode.to === "suggested"
                                    ? "bg-brand-100 text-brand-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                                onClick={() => {
                                  setRouteMode((prev) => ({ ...prev, to: "suggested" }));
                                  if (ruleForm.toArea && !isSuggestedLocationValue(ruleForm.toArea)) {
                                    setRuleForm((prev) => ({ ...prev, toArea: "" }));
                                  }
                                }}
                              >
                                {labels.suggested}
                              </button>
                              <button
                                type="button"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  routeMode.to === "custom"
                                    ? "bg-brand-100 text-brand-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                                onClick={() => setRouteMode((prev) => ({ ...prev, to: "custom" }))}
                              >
                                {labels.custom}
                              </button>
                            </div>
                          </div>

                          {routeMode.to === "suggested" ? (
                            <select
                              className={pricingFilterFieldClass}
                              value={isSuggestedLocationValue(ruleForm.toArea) ? normalizePricingRouteValue(ruleForm.toArea) : ""}
                              onChange={(e) => setRuleForm((prev) => ({ ...prev, toArea: e.target.value }))}
                            >
                              <option value="">{labels.selectKnownLocation}</option>
                              {pricingLocationOptions.map((option) => (
                                <option key={`to-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <input
                                className={pricingFilterFieldClass}
                                value={ruleForm.toArea}
                                onChange={(e) => setRuleForm((prev) => ({ ...prev, toArea: e.target.value }))}
                                placeholder={labels.toAreaPlaceholder}
                              />
                              <div className="mt-2 text-xs text-slate-500">{labels.customLocationHint}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.tripVehicleSection}</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.tripType}</div>
                          <select
                            className={pricingFilterFieldClass}
                            value={ruleForm.tripType}
                            onChange={(e) =>
                              setRuleForm((prev) => ({ ...prev, tripType: e.target.value as PricingTripType }))
                            }
                          >
                            <option value="PICKUP">{labels.tripTypes.PICKUP}</option>
                            <option value="DROPOFF">{labels.tripTypes.DROPOFF}</option>
                            <option value="POINT_TO_POINT">{labels.tripTypes.POINT_TO_POINT}</option>
                          </select>
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.vehicleType}</div>
                          <select
                            className={pricingFilterFieldClass}
                            value={ruleForm.vehicleTypeId}
                            onChange={(e) => setRuleForm((prev) => ({ ...prev, vehicleTypeId: e.target.value }))}
                          >
                            <option value="">{labels.selectVehicle}</option>
                            {vehicleTypes.map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {labels.vehicles[vehicle.name] || vehicle.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.pricingSectionTitle}</div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.basePrice}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={ruleForm.basePriceJpy}
                            onChange={(e) =>
                              setRuleForm((prev) => ({ ...prev, basePriceJpy: Number(e.target.value || 0) }))
                            }
                          />
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.nightFee}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={ruleForm.nightFeeJpy}
                            onChange={(e) =>
                              setRuleForm((prev) => ({ ...prev, nightFeeJpy: Number(e.target.value || 0) }))
                            }
                          />
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.urgentFee}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={ruleForm.urgentFeeJpy}
                            onChange={(e) =>
                              setRuleForm((prev) => ({ ...prev, urgentFeeJpy: Number(e.target.value || 0) }))
                            }
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={pricingSaving}
                    onClick={attemptClosePricingRuleForm}
                  >
                    {labels.cancel}
                  </button>
                  <button
                    className="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 disabled:opacity-60"
                    disabled={pricingSaving}
                    onClick={() => void savePricingRule()}
                  >
                    {pricingSaving
                      ? editingRuleId
                        ? labels.updating
                        : labels.creating
                      : editingRuleId
                        ? labels.update
                        : labels.create}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showOverrideForm ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  attemptClosePricingOverrideForm();
                }
              }}
            >
              <div
                className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_36px_120px_-56px_rgba(15,23,42,0.45)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50/80 to-brand-50/40 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {editingOverrideId ? labels.editOverride : labels.addOverride}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{labels.pricingOverridesSubtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={attemptClosePricingOverrideForm}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      aria-label={labels.close}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
                  <datalist id="pricing-location-options">
                    {pricingLocationOptions.map((option) => (
                      <option key={`override-location-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </datalist>

                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.routeSectionTitle}</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.fromArea}</div>
                          <input
                            list="pricing-location-options"
                            className={pricingFilterFieldClass}
                            value={overrideForm.fromArea}
                            onChange={(e) => setOverrideForm((prev) => ({ ...prev, fromArea: e.target.value }))}
                            placeholder={labels.fromAreaPlaceholder}
                            required
                          />
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.toArea}</div>
                          <input
                            list="pricing-location-options"
                            className={pricingFilterFieldClass}
                            value={overrideForm.toArea}
                            onChange={(e) => setOverrideForm((prev) => ({ ...prev, toArea: e.target.value }))}
                            placeholder={labels.toAreaPlaceholder}
                            required
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.tripVehicleSection}</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.tripType}</div>
                          <select
                            className={pricingFilterFieldClass}
                            value={overrideForm.tripType}
                            onChange={(e) =>
                              setOverrideForm((prev) => ({ ...prev, tripType: e.target.value as PricingTripType }))
                            }
                          >
                            <option value="PICKUP">{labels.tripTypes.PICKUP}</option>
                            <option value="DROPOFF">{labels.tripTypes.DROPOFF}</option>
                            <option value="POINT_TO_POINT">{labels.tripTypes.POINT_TO_POINT}</option>
                          </select>
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.vehicleType}</div>
                          <select
                            className={pricingFilterFieldClass}
                            value={overrideForm.vehicleTypeId}
                            onChange={(e) => setOverrideForm((prev) => ({ ...prev, vehicleTypeId: e.target.value }))}
                            required
                          >
                            <option value="">{labels.selectVehicle}</option>
                            {vehicleTypes.map((vehicle) => (
                              <option key={`override-vehicle-${vehicle.id}`} value={vehicle.id}>
                                {labels.vehicles[vehicle.name] || vehicle.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.specialPeriod}</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.overrideStartAt}</div>
                          <div className="flex min-w-0 gap-2">
                            <LocalizedDatePicker
                              className="flex-[1.5] min-w-[140px]"
                              buttonClassName="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-brand-100"
                              value={overrideForm.startDate}
                              onChange={(value) => setOverrideForm((prev) => ({ ...prev, startDate: value }))}
                              locale={locale}
                              ariaLabel={labels.overrideStartAt}
                            />
                            <input
                              type="time"
                              className="min-w-[112px] flex-1 appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-brand-100"
                              value={overrideForm.startTime}
                              onChange={(e) => setOverrideForm((prev) => ({ ...prev, startTime: e.target.value }))}
                              lang={dateTimeLocale}
                              required
                            />
                          </div>
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.overrideEndAt}</div>
                          <div className="flex min-w-0 gap-2">
                            <LocalizedDatePicker
                              className="flex-[1.5] min-w-[140px]"
                              buttonClassName="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-brand-100"
                              value={overrideForm.endDate}
                              onChange={(value) => setOverrideForm((prev) => ({ ...prev, endDate: value }))}
                              locale={locale}
                              ariaLabel={labels.overrideEndAt}
                              minDate={overrideForm.startDate}
                            />
                            <input
                              type="time"
                              className="min-w-[112px] flex-1 appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm shadow-sm transition focus:outline-none focus:ring-4 focus:ring-brand-100"
                              value={overrideForm.endTime}
                              onChange={(e) => setOverrideForm((prev) => ({ ...prev, endTime: e.target.value }))}
                              lang={dateTimeLocale}
                              required
                            />
                          </div>
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{labels.pricingSectionTitle}</div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.basePrice}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={overrideForm.basePriceJpy}
                            onChange={(e) =>
                              setOverrideForm((prev) => ({ ...prev, basePriceJpy: Number(e.target.value || 0) }))
                            }
                            min={0}
                            required
                          />
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.nightFee}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={overrideForm.nightFeeJpy}
                            onChange={(e) =>
                              setOverrideForm((prev) => ({ ...prev, nightFeeJpy: Number(e.target.value || 0) }))
                            }
                            min={0}
                          />
                        </label>

                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.urgentFee}</div>
                          <input
                            type="number"
                            className={pricingFilterFieldClass}
                            value={overrideForm.urgentFeeJpy}
                            onChange={(e) =>
                              setOverrideForm((prev) => ({ ...prev, urgentFeeJpy: Number(e.target.value || 0) }))
                            }
                            min={0}
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <label className="block text-sm">
                          <div className="mb-2 font-medium text-slate-700">{labels.overrideNote}</div>
                          <textarea
                            className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                            value={overrideForm.note}
                            onChange={(e) => setOverrideForm((prev) => ({ ...prev, note: e.target.value }))}
                            placeholder={labels.overrideNotePlaceholder}
                          />
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            checked={overrideForm.enabled}
                            onChange={(e) => setOverrideForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                          />
                          {labels.overrideEnabled}
                        </label>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={pricingSaving}
                    onClick={attemptClosePricingOverrideForm}
                  >
                    {labels.cancel}
                  </button>
                  <button
                    className="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 disabled:opacity-60"
                    disabled={pricingSaving}
                    onClick={() => void savePricingOverride()}
                  >
                    {pricingSaving
                      ? editingOverrideId
                        ? labels.updating
                        : labels.creating
                      : editingOverrideId
                        ? labels.update
                        : labels.create}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showImportModal && importPreview ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowImportModal(false);
                }
              }}
            >
              <div
                className="w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_36px_120px_-56px_rgba(15,23,42,0.45)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/40 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{labels.importTitle}</div>
                      <div className="mt-1 text-sm text-slate-500">{labels.importSubtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      aria-label={labels.close}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                    <div className="text-xs font-semibold tracking-[0.06em] text-slate-500">{labels.fileName}</div>
                    <div className="mt-1.5 text-sm font-medium text-slate-900">{importPreview.fileName}</div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 text-sm font-semibold text-slate-900">{labels.importSummary}</div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">{labels.importRows}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{importPreview.summary.totalRows}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">{labels.importValidRows}</div>
                        <div className="mt-2 text-2xl font-semibold text-emerald-700">{importPreview.summary.validRows}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">{labels.importInvalidRows}</div>
                        <div className="mt-2 text-2xl font-semibold text-rose-700">{importPreview.summary.errorRows}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">{labels.importCreateCount}</div>
                        <div className="mt-2 text-2xl font-semibold text-brand-700">{importPreview.summary.createCount}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">{labels.importUpdateCount}</div>
                        <div className="mt-2 text-2xl font-semibold text-amber-700">{importPreview.summary.updateCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.45fr]">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">{labels.importErrors}</div>
                        <div className="text-xs text-slate-500">{importPreview.errors.length}</div>
                      </div>
                      <div className="space-y-3">
                        {importPreview.errors.length === 0 ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {labels.noErrorsFound}
                          </div>
                        ) : (
                          importPreview.errors.map((errorRow, index) => (
                            <div
                              key={`${errorRow.rowNumber}-${errorRow.field}-${index}`}
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
                            >
                              <div className="text-xs font-semibold text-rose-600">
                                {labels.rowNumber} {errorRow.rowNumber}
                              </div>
                              <div className="mt-1.5 text-sm text-rose-700">{errorRow.reason}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">{labels.importValidRows}</div>
                        <div className="text-xs text-slate-500">{importPreview.rows.length}</div>
                      </div>
                      {importPreview.rows.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          {labels.importNoValidRows}
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50/90 text-left text-slate-500">
                                <tr className="border-b border-slate-200">
                                  <th className="px-4 py-3 text-xs font-semibold tracking-[0.06em]">{labels.rowNumber}</th>
                                  <th className="px-4 py-3 text-xs font-semibold tracking-[0.06em]">{labels.route}</th>
                                  <th className="px-4 py-3 text-xs font-semibold tracking-[0.06em]">{labels.tripType}</th>
                                  <th className="px-4 py-3 text-xs font-semibold tracking-[0.06em]">{labels.vehicleType}</th>
                                  <th className="px-4 py-3 text-xs font-semibold tracking-[0.06em]">{labels.notesLabel}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {importPreview.rows.map((row) => (
                                  <tr key={`${row.rowNumber}-${row.fromArea}-${row.toArea}-${row.vehicleTypeId}`}>
                                    <td className="px-4 py-4 text-slate-600">{row.rowNumber}</td>
                                    <td className="px-4 py-4">
                                      <div className="font-medium text-slate-900">
                                        {getPricingDisplayValue(row.fromArea)} {"->"} {getPricingDisplayValue(row.toArea)}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        {row.fromArea} {"->"} {row.toArea}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                          {getTripTypeLabel(row.tripType)}
                                        </span>
                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                            row.action === "create"
                                              ? "bg-brand-50 text-brand-700"
                                              : "bg-amber-50 text-amber-700"
                                          }`}
                                        >
                                          {row.action === "create" ? labels.willCreate : labels.willUpdate}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-700">
                                      {labels.vehicles[row.vehicleTypeName] || row.vehicleTypeName}
                                    </td>
                                    <td className="px-4 py-4 text-slate-500">
                                      {row.notes.length > 0 ? row.notes.join(" / ") : labels.notProvided}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setShowImportModal(false)}
                  >
                    {labels.cancel}
                  </button>
                  <button
                    className="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={importSubmitting || importPreview.rows.length === 0 || importPreview.errors.length > 0}
                    onClick={() => void commitPricingImport()}
                  >
                    {importSubmitting ? labels.importing : labels.confirmImport}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
