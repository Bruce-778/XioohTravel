"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import { formatDateTimeJST } from "@/lib/timeFormat";
import type { Currency } from "@/lib/currency";

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
  totalJpy: number;
  pricingManualAdjustmentJpy: number;
  pricingNote: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
};
type PricingRule = {
  id: string;
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

type VehicleType = {
  id: string;
  name: string;
  seats: number;
};

type Labels = {
  loginTitle: string;
  loginSubtitle: string;
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
  statuses: Record<string, string>;
  vehicles: Record<string, string>;
  pricing: string;
  pricingTitle: string;
  pricingSubtitle: string;
  addRule: string;
  editRule: string;
  deleteRule: string;
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
  pricingManualAdjustment: string;
  pricingNoteValue: string;
  createdAt: string;
  cancelledAt: string;
  cancelReasonValue: string;
  notProvided: string;
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

export function AdminClient({ labels, locale = "zh-CN" }: { labels: Labels; locale?: string }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
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
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const editingRule = useMemo(() => pricingRules.find((r) => r.id === editingRuleId) ?? null, [pricingRules, editingRuleId]);
  
  // Pagination calculations
  const totalPages = Math.ceil(pricingRules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRules = pricingRules.slice(startIndex, endIndex);
  const isPricingLocked = editingRow ? editingRow.status !== "PENDING_PAYMENT" : false;
  const [ruleForm, setRuleForm] = useState({
    fromArea: "",
    toArea: "",
    tripType: "PICKUP" as "PICKUP" | "DROPOFF" | "POINT_TO_POINT",
    vehicleTypeId: "",
    basePriceJpy: 0,
    nightFeeJpy: 0,
    urgentFeeJpy: 0
  });

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
        if (res.ok) {
          // If already verified (cookie exists), just set a dummy token to enable UI
          setToken("verified");
          // Auto load orders
          load();
        }
      } catch (err) {
        // Not verified
      } finally {
        setIsChecking(false);
      }
    };
    checkAdmin();
  }, []);

  function getFilterDates() {
    if (startDate && endDate) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    return { startDate: null, endDate: null };
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

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setRows(data.rows ?? []);
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

  async function loadPricingRules() {
    setPricingLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pricing", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.loadFailed);
      setPricingRules(sortPricingRules(data.rules ?? []));
    } catch (e: any) {
      setError(e?.message ?? labels.loadFailed);
    } finally {
      setPricingLoading(false);
    }
  }

  useEffect(() => {
    if (editingRule) {
      setShowRuleForm(true);
      setRuleForm({
        fromArea: editingRule.fromArea,
        toArea: editingRule.toArea,
        tripType: editingRule.tripType as any,
        vehicleTypeId: editingRule.vehicleType.id,
        basePriceJpy: editingRule.basePriceJpy,
        nightFeeJpy: editingRule.nightFeeJpy,
        urgentFeeJpy: editingRule.urgentFeeJpy
      });
    }
  }, [editingRule]);

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

      if (data?.rule) {
        setPricingRules((prev) => {
          const next = editingRuleId
            ? prev.map((rule) => (rule.id === data.rule.id ? data.rule : rule))
            : [data.rule, ...prev];
          return sortPricingRules(next);
        });
      } else {
        await loadPricingRules();
      }

      setEditingRuleId(null);
      setShowRuleForm(false);
      setRuleForm({
        fromArea: "",
        toArea: "",
        tripType: "PICKUP",
        vehicleTypeId: "",
        basePriceJpy: 0,
        nightFeeJpy: 0,
        urgentFeeJpy: 0
      });
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
      setPricingRules((prev) => prev.filter((rule) => rule.id !== id));
    } catch (e: any) {
      setError(e?.message ?? labels.deleteFailed);
    } finally {
      setDeletingRuleId(null);
    }
  }

  useEffect(() => {
    if (token && activeTab === "pricing") {
      void Promise.all([loadVehicles(), loadPricingRules()]);
    }
  }, [token, activeTab]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRuleForm) {
          setEditingRuleId(null);
          setShowRuleForm(false);
          setRuleForm({
            fromArea: "",
            toArea: "",
            tripType: "PICKUP",
            vehicleTypeId: "",
            basePriceJpy: 0,
            nightFeeJpy: 0,
            urgentFeeJpy: 0
          });
        }
        if (editingRow) {
          setEditingId(null);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showRuleForm, editingRow]);

  async function handleLogin() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ secret: token })
      });
      if (res.ok) {
        setToken("verified");
        if (activeTab === "orders") {
          void load();
        } else {
          void Promise.all([loadVehicles(), loadPricingRules()]);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || "Invalid secret");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
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
                type="password"
                value={token === "verified" ? "" : token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={token === "verified" ? labels.verified : labels.loginPlaceholder}
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-brand-500 outline-none transition-all text-lg font-mono tracking-widest text-center"
              />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading || token === "verified"}
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
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-[1.5] min-w-[140px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                lang={locale.startsWith("zh") ? "zh-CN" : "en-US"}
              />
              <input
                type="time"
                className="flex-1 min-w-[100px] pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                lang={locale.startsWith("zh") ? "zh-CN" : "en-US"}
              />
            </div>
          </div>
          
          {/* End Date & Time - Compact Layout */}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs text-slate-500 mb-1.5">{labels.endDate}</div>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-[1.5] min-w-[140px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                lang={locale.startsWith("zh") ? "zh-CN" : "en-US"}
              />
              <input
                type="time"
                className="flex-1 min-w-[100px] pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                lang={locale.startsWith("zh") ? "zh-CN" : "en-US"}
              />
            </div>
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
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 text-sm font-medium transition-colors whitespace-nowrap"
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
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md animate-pulse">
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
                                className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors text-sm font-semibold whitespace-nowrap"
                                onClick={() => setExpandedBookingId(isExpanded ? null : r.id)}
                              >
                                {isExpanded ? labels.hideDetails : labels.details}
                              </button>
                              <button
                                className="px-5 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-700 transition-colors text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg"
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="font-semibold">{labels.pricingTitle}</div>
            <div className="text-sm text-slate-600 mt-1">{labels.pricingSubtitle}</div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  setEditingRuleId(null);
                  setShowRuleForm(true);
                  setRuleForm({
                    fromArea: "",
                    toArea: "",
                    tripType: "PICKUP",
                    vehicleTypeId: "",
                    basePriceJpy: 0,
                    nightFeeJpy: 0,
                    urgentFeeJpy: 0
                  });
                }}
                disabled={pricingLoading || pricingSaving || !token}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 text-sm font-medium"
              >
                {labels.addRule}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4">{labels.fromArea}</th>
                    <th className="py-2 pr-4">{labels.toArea}</th>
                    <th className="py-2 pr-4">{labels.tripType}</th>
                    <th className="py-2 pr-4">{labels.vehicleType}</th>
                    <th className="py-2 pr-4">{labels.basePrice}</th>
                    <th className="py-2 pr-4">{labels.nightFee}</th>
                    <th className="py-2 pr-4">{labels.urgentFee}</th>
                    <th className="py-2 pr-4">{labels.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRules.length === 0 ? (
                    <tr>
                      <td className="py-4 text-slate-500" colSpan={8}>
                        {pricingLoading ? labels.loading : labels.noRules}
                      </td>
                    </tr>
                  ) : (
                    paginatedRules.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">{r.fromArea}</td>
                        <td className="py-3 pr-4">{r.toArea}</td>
                        <td className="py-3 pr-4">
                          {labels.tripTypes[r.tripType as keyof typeof labels.tripTypes] || r.tripType}
                        </td>
                        <td className="py-3 pr-4">{labels.vehicles[r.vehicleType.name] || r.vehicleType.name}</td>
                        <td className="py-3 pr-4">{formatMoneyFromJpy(r.basePriceJpy, currency, locale)}</td>
                        <td className="py-3 pr-4">{formatMoneyFromJpy(r.nightFeeJpy, currency, locale)}</td>
                        <td className="py-3 pr-4">{formatMoneyFromJpy(r.urgentFeeJpy, currency, locale)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                              onClick={() => {
                                setEditingRuleId(r.id);
                                setShowRuleForm(true);
                              }}
                              disabled={pricingSaving || deletingRuleId !== null}
                            >
                              {labels.edit}
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm"
                              onClick={() => deletePricingRule(r.id)}
                              disabled={pricingSaving || deletingRuleId !== null}
                            >
                              {deletingRuleId === r.id ? labels.deleting : labels.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pricingRules.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  {labels.pageOf
                    .replace("{total}", String(pricingRules.length))
                    .replace("{current}", String(currentPage))
                    .replace("{totalPages}", String(totalPages))}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {labels.previous}
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {labels.next}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Edit Rule Modal */}
          {showRuleForm ? (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditingRuleId(null);
                  setShowRuleForm(false);
                  setRuleForm({
                    fromArea: "",
                    toArea: "",
                    tripType: "PICKUP",
                    vehicleTypeId: "",
                    basePriceJpy: 0,
                    nightFeeJpy: 0,
                    urgentFeeJpy: 0
                  });
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="font-semibold text-lg mb-4">
                    {editingRuleId ? labels.editRule : labels.addRule}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.fromArea}</div>
                      <input
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.fromArea}
                        onChange={(e) => setRuleForm({ ...ruleForm, fromArea: e.target.value })}
                        placeholder={labels.fromAreaPlaceholder}
                      />
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.toArea}</div>
                      <input
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.toArea}
                        onChange={(e) => setRuleForm({ ...ruleForm, toArea: e.target.value })}
                        placeholder={labels.toAreaPlaceholder}
                      />
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.tripType}</div>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.tripType}
                        onChange={(e) => setRuleForm({ ...ruleForm, tripType: e.target.value as any })}
                      >
                        <option value="PICKUP">{labels.tripTypes.PICKUP}</option>
                        <option value="DROPOFF">{labels.tripTypes.DROPOFF}</option>
                        <option value="POINT_TO_POINT">{labels.tripTypes.POINT_TO_POINT}</option>
                      </select>
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.vehicleType}</div>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.vehicleTypeId}
                        onChange={(e) => setRuleForm({ ...ruleForm, vehicleTypeId: e.target.value })}
                      >
                        <option value="">{labels.selectVehicle}</option>
                        {vehicleTypes.map((v) => (
                          <option key={v.id} value={v.id}>
                            {labels.vehicles[v.name] || v.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.basePrice}</div>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.basePriceJpy}
                        onChange={(e) => setRuleForm({ ...ruleForm, basePriceJpy: Number(e.target.value) })}
                      />
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.nightFee}</div>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.nightFeeJpy}
                        onChange={(e) => setRuleForm({ ...ruleForm, nightFeeJpy: Number(e.target.value) })}
                      />
                    </label>

                    <label className="text-sm block">
                      <div className="text-slate-700 mb-1">{labels.urgentFee}</div>
                      <input
                        type="number"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                        value={ruleForm.urgentFeeJpy}
                        onChange={(e) => setRuleForm({ ...ruleForm, urgentFeeJpy: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex gap-2 justify-end">
                    <button
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                      disabled={pricingSaving}
                      onClick={() => {
                        setEditingRuleId(null);
                        setShowRuleForm(false);
                        setRuleForm({
                          fromArea: "",
                          toArea: "",
                          tripType: "PICKUP",
                          vehicleTypeId: "",
                          basePriceJpy: 0,
                          nightFeeJpy: 0,
                          urgentFeeJpy: 0
                        });
                      }}
                    >
                      {labels.cancel}
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
                      disabled={pricingSaving}
                      onClick={savePricingRule}
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
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
