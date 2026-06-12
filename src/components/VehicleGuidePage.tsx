import Image from "next/image";
import { getT } from "@/lib/i18n";
import { getVehicleImageByKey, type VehicleImageKey } from "@/lib/vehicleImages";
import {
  LuggageCapacityDisplay,
  type LuggageDisplayLabels,
} from "@/components/LuggageCapacityDisplay";

const VEHICLES = [
  {
    vehicleKey: "5seats",
    nameKey: "vehicle.5seats",
    descKey: "vehicle.desc.5seats",
    maxPassengers: 4,
    luggage: [2, 1],
  },
  {
    vehicleKey: "7seats",
    nameKey: "vehicle.7seats",
    descKey: "vehicle.desc.7seats",
    maxPassengers: 6,
    luggage: [4, 3],
  },
  {
    vehicleKey: "9seats",
    nameKey: "vehicle.9seats",
    descKey: "vehicle.desc.9seats",
    maxPassengers: 8,
    luggage: [6, 4],
  },
  {
    vehicleKey: "luxury",
    nameKey: "vehicle.luxury",
    descKey: "vehicle.desc.luxury",
    maxPassengers: 4,
    luggage: [3, 2],
  },
  {
    vehicleKey: "bus",
    nameKey: "vehicle.bus",
    descKey: "vehicle.desc.bus",
    maxPassengers: 20,
    luggage: [20, 20],
  },
] satisfies Array<{
  vehicleKey: VehicleImageKey;
  nameKey: string;
  descKey: string;
  maxPassengers: number;
  luggage: [number, number];
}>;

function PassengerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 21a6.5 6.5 0 0113 0" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 10.5a2.5 2.5 0 110-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21a5 5 0 00-3-4.58" />
    </svg>
  );
}

export async function VehicleGuidePage() {
  const { t } = await getT();
  const luggageLabels: LuggageDisplayLabels = {
    carryOn: t("luggage.carryOn"),
    mediumSuitcase: t("luggage.mediumSuitcase"),
    carryOnSize: t("luggage.carryOnSize"),
    mediumSize: t("luggage.mediumSize"),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
            {t("fleet.eyebrow")}
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {t("fleet.title")}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {t("fleet.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VEHICLES.map((vehicle) => {
            const vehicleName = t(vehicle.nameKey);
            const vehicleImage = getVehicleImageByKey(vehicle.vehicleKey);
            const maxPassengersText = t("fleet.maxPassengersValue").replace(
              "{count}",
              String(vehicle.maxPassengers)
            );

            return (
              <article
                key={vehicle.nameKey}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                {vehicleImage ? (
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 via-white to-blue-50">
                    <Image
                      src={vehicleImage}
                      alt={vehicleName}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, calc(100vw - 32px)"
                      className="object-contain p-4"
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <h2 className="text-xl font-black text-slate-950">{vehicleName}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(vehicle.descKey)}</p>
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-brand-800">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
                      <PassengerIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 text-sm font-black text-slate-950">
                      <span className="text-brand-700">
                        {t("fleet.maxPassengers")}
                      </span>
                      <span className="ml-1">
                        {maxPassengersText}
                      </span>
                    </span>
                  </div>
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {t("fleet.luggage")}
                    </div>
                    <LuggageCapacityDisplay
                      small={vehicle.luggage[0]}
                      medium={vehicle.luggage[1]}
                      labels={luggageLabels}
                      variant="stacked"
                      className="mt-3"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-slate-500">
          {t("fleet.note")}
        </p>
      </div>
    </div>
  );
}
