"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import { formatDateTimeJST } from "@/lib/timeFormat";
import type { Currency } from "@/lib/currency";
import { useSession } from "@/hooks/useSession";

function getCurrencyFromCookie(): Currency {
  if (typeof document === "undefined") return "JPY";
  const cookie = document.cookie.split("; ").find((c) => c.startsWith("XioohTravel_currency="));
  const currencyFromCookie = cookie?.split("=")[1]?.toUpperCase();
  if (currencyFromCookie === "USD" || currencyFromCookie === "CNY") {
    return currencyFromCookie;
  }
  return "JPY";
}

type BookingRow = {
  id: string;
  createdAt: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  contactEmail: string;
  status: string;
  isUrgent: boolean;
  totalJpy: number;
  vehicleName: string;
};

type Labels = {
  queryTitle: string;
  querySubtitle: string;
  email: string;
  search: string;
  searching: string;
  list: string;
  none: string;
  cancel: string;
  cancelled: string;
  cancelTitle: string;
  cancelReason: string;
  cancelConfirm: string;
  close: string;
  processing: string;
  urgentHint: string;
  queryFailed: string;
  cancelFailed: string;
  id: string;
  pickup: string;
  vehicle: string;
  amount: string;
  status: string;
  action: string;
  urgentTag: string;
  cancelReasonDefault: string;
  statuses: Record<string, string>;
  vehicles: Record<string, string>;
  account: string;
  refresh: string;
  loginRequired: string;
  loginDesc: string;
  loginButton: string;
  cancelReasonPlaceholder: string;
  closeButton?: string;
  retryPayment: string;
  retryingPayment: string;
  emailRequired: string;
  guestLookupHint: string;
  pendingPaymentHint: string;
};

export function OrdersClient({
  labels,
  locale = "zh-CN",
  initialEmail = "",
}: {
  labels: Labels;
  locale?: string;
  initialEmail?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [queryEmail, setQueryEmail] = useState(initialEmail);
  const [hasSearched, setHasSearched] = useState(Boolean(initialEmail));
  const { user } = useSession();

  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState(labels.cancelReasonDefault);

  const cancelBooking = useMemo(
    () => rows.find((row) => row.id === cancelBookingId) ?? null,
    [rows, cancelBookingId]
  );

  useEffect(() => {
    setCurrency(getCurrencyFromCookie());

    const handleCurrencyChange = () => {
      setCurrency(getCurrencyFromCookie());
    };

    window.addEventListener("currencyChanged", handleCurrencyChange);

    const interval = setInterval(() => {
      const currentCurrency = getCurrencyFromCookie();
      setCurrency((prev) => (currentCurrency !== prev ? currentCurrency : prev));
    }, 500);

    return () => {
      window.removeEventListener("currencyChanged", handleCurrencyChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setCancelReason(labels.cancelReasonDefault);
  }, [labels.cancelReasonDefault]);

  useEffect(() => {
    if (user) {
      void loadAccountOrders();
      return;
    }

    if (initialEmail) {
      void loadGuestOrders(initialEmail, { markSearched: true });
    }
  }, [user, initialEmail]);

  async function loadAccountOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.queryFailed);
      setRows(data.rows ?? []);
    } catch (e: any) {
      setError(e?.message ?? labels.queryFailed);
    } finally {
      setLoading(false);
    }
  }

  async function loadGuestOrders(email: string, options?: { markSearched?: boolean }) {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(labels.emailRequired);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(normalizedEmail)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.queryFailed);
      setRows(data.rows ?? []);
      setHasSearched(options?.markSearched ?? true);
    } catch (e: any) {
      setError(e?.message ?? labels.queryFailed);
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    if (user) {
      await loadAccountOrders();
      return;
    }
    await loadGuestOrders(queryEmail);
  }

  async function cancel() {
    if (!cancelBooking) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: cancelBooking.id,
          contactEmail: cancelBooking.contactEmail,
          reason: cancelReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.cancelFailed);
      setCancelBookingId(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? labels.cancelFailed);
    } finally {
      setLoading(false);
    }
  }

  async function retryPayment(row: BookingRow) {
    setActionLoadingId(row.id);
    setError(null);
    try {
      const res = await fetch("/api/bookings/retry-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: row.id,
          contactEmail: user ? undefined : row.contactEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.queryFailed);
      if (!data?.checkoutUrl) throw new Error(labels.queryFailed);
      window.location.assign(data.checkoutUrl);
    } catch (e: any) {
      setError(e?.message ?? labels.queryFailed);
      setActionLoadingId(null);
    }
  }

  const showResults = Boolean(user) || hasSearched;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{labels.list}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {labels.account}: <span className="font-medium text-slate-700">{user.email}</span>
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? labels.searching : labels.refresh}
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await loadGuestOrders(queryEmail, { markSearched: true });
            }}
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">{labels.queryTitle}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{labels.querySubtitle}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={queryEmail}
                onChange={(event) => setQueryEmail(event.target.value)}
                placeholder={labels.email}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? labels.searching : labels.search}
              </button>
            </div>
            <p className="text-xs text-slate-500">{labels.guestLookupHint}</p>
          </form>
        )}
      </div>

      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      ) : null}

      {showResults ? (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 font-medium border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold">{labels.id}</th>
                  <th className="px-6 py-3 font-semibold">{labels.pickup}</th>
                  <th className="px-6 py-3 font-semibold">{labels.vehicle}</th>
                  <th className="px-6 py-3 font-semibold">{labels.amount}</th>
                  <th className="px-6 py-3 font-semibold">{labels.status}</th>
                  <th className="px-6 py-3 font-semibold">{labels.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {labels.none}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const displayVehicle = labels.vehicles[row.vehicleName] || row.vehicleName;
                    const displayStatus = labels.statuses[row.status] || row.status;
                    const isRetryable = row.status === "PENDING_PAYMENT";

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{row.id}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{formatDateTimeJST(row.pickupTime, locale)}</td>
                        <td className="px-6 py-4 text-slate-600">{displayVehicle}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatMoneyFromJpy(row.totalJpy, currency, locale)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              row.status === "CANCELLED" ? "bg-slate-100 text-slate-500" :
                              row.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                              row.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                              row.status === "PENDING_PAYMENT" ? "bg-amber-50 text-amber-700" :
                              "bg-blue-50 text-blue-700"
                            }`}>
                              {displayStatus}
                            </span>
                            {row.isUrgent ? (
                              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tight px-1">
                                {labels.urgentTag}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-3 items-center">
                            {isRetryable ? (
                              <button
                                className="text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline transition-all"
                                onClick={() => retryPayment(row)}
                                disabled={actionLoadingId === row.id}
                              >
                                {actionLoadingId === row.id ? labels.retryingPayment : labels.retryPayment}
                              </button>
                            ) : null}
                            {row.status !== "CANCELLED" && row.status !== "COMPLETED" ? (
                              row.isUrgent ? (
                                <span className="text-xs text-slate-400 cursor-help" title={labels.urgentHint}>
                                  {labels.cancel}
                                </span>
                              ) : (
                                <button
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all"
                                  onClick={() => setCancelBookingId(row.id)}
                                >
                                  {labels.cancel}
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {labels.pendingPaymentHint}
            </p>
          </div>
        </div>
      ) : null}

      {cancelBookingId && cancelBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h4 className="text-xl font-bold text-slate-900 mb-2">{labels.cancelTitle}</h4>
            <p className="text-sm text-slate-500 mb-6">
              {labels.id}: <span className="font-mono text-xs">{cancelBookingId}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{labels.cancelReason}</label>
                <input
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={labels.cancelReasonPlaceholder}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="flex-[2] py-3.5 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                  onClick={cancel}
                  disabled={loading}
                >
                  {loading ? labels.processing : labels.cancelConfirm}
                </button>
                <button
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 active:scale-95 transition-all"
                  onClick={() => setCancelBookingId(null)}
                  disabled={loading}
                >
                  {labels.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
