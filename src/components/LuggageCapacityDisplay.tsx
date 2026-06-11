export type LuggageKind = "small" | "medium";

export type LuggageDisplayLabels = {
  carryOn: string;
  mediumSuitcase: string;
  carryOnSize: string;
  mediumSize: string;
};

type LuggageCapacityDisplayProps = {
  small: number;
  medium: number;
  labels: LuggageDisplayLabels;
  variant?: "inline" | "stacked";
  showSizes?: boolean;
  className?: string;
};

type LuggageSizeGuideProps = {
  labels: LuggageDisplayLabels;
  title: string;
  className?: string;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function getLuggageItems(labels: LuggageDisplayLabels) {
  return [
    {
      key: "small" as const,
      label: labels.carryOn,
      size: labels.carryOnSize,
    },
    {
      key: "medium" as const,
      label: labels.mediumSuitcase,
      size: labels.mediumSize,
    },
  ];
}

export function LuggageIcon({ kind, className }: { kind: LuggageKind; className?: string }) {
  if (kind === "small") {
    return (
      <svg className={cn("h-4 w-4", className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8V6a3 3 0 016 0v2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9h10l1 9a3 3 0 01-3 3H9a3 3 0 01-3-3l1-9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13h8M9 17h6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12H4m14 0h2" />
      </svg>
    );
  }

  return (
    <svg className={cn("h-4 w-4", className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6M9 14h6M9 20v2M15 20v2" />
    </svg>
  );
}

export function LuggageCapacityDisplay({
  small,
  medium,
  labels,
  variant = "inline",
  showSizes = false,
  className,
}: LuggageCapacityDisplayProps) {
  const counts = {
    small,
    medium,
  };
  const items = getLuggageItems(labels);

  if (variant === "stacked") {
    return (
      <div className={cn("grid gap-2", className)}>
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-100">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <LuggageIcon kind={item.key} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">
                {counts[item.key]} {item.label}
              </span>
              {showSizes ? (
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">{item.size}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
          title={item.size}
        >
          <LuggageIcon kind={item.key} />
          <span>
            {counts[item.key]} {item.label}
          </span>
          {showSizes ? (
            <span className="font-black text-brand-700">{item.size}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function LuggageSizeGuide({ labels, title, className }: LuggageSizeGuideProps) {
  return (
    <div className={cn("rounded-3xl border border-brand-100 bg-white/80 p-4 shadow-sm shadow-blue-100/40", className)}>
      <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">{title}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {getLuggageItems(labels).map((item) => (
          <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/70 px-3 py-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
              <LuggageIcon kind={item.key} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">{item.label}</span>
              <span className="block text-xs font-semibold text-slate-500">{item.size}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
