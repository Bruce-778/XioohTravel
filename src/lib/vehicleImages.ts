export type VehicleImageKey = "5seats" | "7seats" | "9seats" | "luxury" | "bus";

export const VEHICLE_IMAGE_BY_KEY: Record<VehicleImageKey, string> = {
  "5seats": "/vehicles/5seats_vehicle.png",
  "7seats": "/vehicles/7seats_vehicle.png",
  "9seats": "/vehicles/9seats_vehicle.png",
  luxury: "/vehicles/Alphard_vehicle.png",
  bus: "/vehicles/Minibus_vehicle.png",
};

export function getVehicleImageByKey(vehicleKey: string) {
  return VEHICLE_IMAGE_BY_KEY[vehicleKey as VehicleImageKey] ?? null;
}
