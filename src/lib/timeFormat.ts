// 时间格式化工具，统一显示 JST 时区

export function parseJstDateTime(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

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

export function formatJstDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
}

export function formatDateTimeJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const isZh = locale.startsWith("zh");
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: isZh ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    timeZoneName: "short"
  };
  const formatted = new Intl.DateTimeFormat(locale, options).format(d);
  // 确保显示 JST
  if (formatted.includes("JST") || formatted.includes("GMT+9")) {
    return formatted;
  }
  return `${formatted} (JST)`;
}

export function formatDateJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const isZh = locale.startsWith("zh");
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: isZh ? "numeric" : "short",
    day: "numeric",
    timeZone: "Asia/Tokyo"
  };
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatTimeJST(date: Date | string, locale: string = "zh-CN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo"
  };
  const time = new Intl.DateTimeFormat(locale, options).format(d);
  return `${time} JST`;
}
