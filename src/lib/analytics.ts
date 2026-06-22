export type DataLayerPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushDataLayerEvent(event: string, payload: DataLayerPayload = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...payload,
  });
}

export function buildRoutePayload({
  tripType,
  fromArea,
  toArea,
  pickupTime,
  passengers,
  children,
  luggageSmall,
  luggageMedium,
}: {
  tripType: string;
  fromArea: string;
  toArea: string;
  pickupTime: string;
  passengers: number;
  children: number;
  luggageSmall: number;
  luggageMedium: number;
}) {
  return {
    trip_type: tripType,
    from_area: fromArea,
    to_area: toArea,
    route: `${fromArea} -> ${toArea}`,
    pickup_time: pickupTime,
    passengers,
    children,
    luggage_small: luggageSmall,
    luggage_medium: luggageMedium,
  };
}
