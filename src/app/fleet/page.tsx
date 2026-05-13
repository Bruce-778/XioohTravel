import Image from "next/image";
import { getT } from "@/lib/i18n";
import { getVehicleImageByKey, type VehicleImageKey } from "@/lib/vehicleImages";

const VEHICLES = [
  {
    vehicleKey: "5seats",
    nameKey: "vehicle.5seats",
    descKey: "vehicle.desc.5seats",
    luggage: [2, 1, 1],
  },
  {
    vehicleKey: "7seats",
    nameKey: "vehicle.7seats",
    descKey: "vehicle.desc.7seats",
    luggage: [4, 3, 2],
  },
  {
    vehicleKey: "9seats",
    nameKey: "vehicle.9seats",
    descKey: "vehicle.desc.9seats",
    luggage: [6, 4, 3],
  },
  {
    vehicleKey: "luxury",
    nameKey: "vehicle.luxury",
    descKey: "vehicle.desc.luxury",
    luggage: [3, 2, 2],
  },
  {
    vehicleKey: "bus",
    nameKey: "vehicle.bus",
    descKey: "vehicle.desc.bus",
    luggage: [20, 20, 20],
  },
] satisfies Array<{
  vehicleKey: VehicleImageKey;
  nameKey: string;
  descKey: string;
  luggage: [number, number, number];
}>;

export default async function FleetPage() {
  const { t } = await getT();

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
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {t("fleet.luggage")}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-lg font-black text-slate-950">{vehicle.luggage[0]}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{t("fleet.small")}</div>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-lg font-black text-slate-950">{vehicle.luggage[1]}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{t("fleet.medium")}</div>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-lg font-black text-slate-950">{vehicle.luggage[2]}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{t("fleet.large")}</div>
                      </div>
                    </div>
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
