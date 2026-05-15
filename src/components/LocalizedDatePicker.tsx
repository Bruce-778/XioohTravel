"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDatePartValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDatePart(value: string) {
  const parts = value.split("-");
  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts.map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function formatDateFieldValue(datePart: string, locale: string) {
  const parsed = parseDatePart(datePart);
  if (!parsed) {
    return datePart;
  }

  return new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(parsed.year, parsed.month - 1, parsed.day));
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

type LocalizedDatePickerProps = {
  value: string;
  locale: string;
  onChange: (nextValue: string) => void;
  ariaLabel: string;
  placeholder?: string;
  minDate?: string;
  className?: string;
  buttonClassName?: string;
};

export function LocalizedDatePicker({
  value,
  locale,
  onChange,
  ariaLabel,
  placeholder,
  minDate,
  className,
  buttonClassName,
}: LocalizedDatePickerProps) {
  const parsed = useMemo(() => parseDatePart(value), [value]);
  const parsedMinDate = useMemo(() => (minDate ? parseDatePart(minDate) : null), [minDate]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (parsed) return new Date(parsed.year, parsed.month - 1, 1);
    if (parsedMinDate) return new Date(parsedMinDate.year, parsedMinDate.month - 1, 1);
    return new Date();
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isZh = locale.startsWith("zh");
  const calendarLocale = isZh ? "zh-CN" : "en-GB";
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        year: "numeric",
      }).format(viewMonth),
    [calendarLocale, viewMonth]
  );
  const minDateKey = minDate?.trim() || "";

  useEffect(() => {
    if (parsed) {
      setViewMonth(new Date(parsed.year, parsed.month - 1, 1));
    } else if (parsedMinDate) {
      setViewMonth(new Date(parsedMinDate.year, parsedMinDate.month - 1, 1));
    }
  }, [parsed?.year, parsed?.month, parsedMinDate?.year, parsedMinDate?.month]);

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
    onChange(nextDatePart);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        className={
          buttonClassName
            ? cn("flex min-w-0 items-center justify-between text-left", buttonClassName)
            : "input-field flex min-w-0 items-center justify-between text-left"
        }
        onClick={() => setIsOpen((open) => !open)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate text-slate-900">
          {value
            ? formatDateFieldValue(value, locale)
            : (placeholder ?? (isZh ? "选择日期" : "Select date"))}
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
              const isSelected = day.key === value;
              const isDisabled = Boolean(minDateKey && day.key < minDateKey);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => updateDate(day.key)}
                  disabled={isDisabled}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm transition-colors",
                    isSelected
                      ? "bg-brand-600 font-semibold text-white shadow-sm"
                      : day.inCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-50",
                    day.isToday && !isSelected && "border border-brand-200 bg-brand-50/60 text-brand-700",
                    isDisabled && "cursor-not-allowed border-0 bg-transparent text-slate-200 hover:bg-transparent"
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
  );
}
