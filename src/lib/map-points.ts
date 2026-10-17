import type { Formatter } from "./format";
import type { ChargingPlace, VisitedPlace } from "./places-data";
import type { LngLat } from "./route";
import { stopDetail, type Trip } from "./trip";

export type TripMarker = {
  key: string;
  kind: "start" | "end" | "stop" | "charge";
  label: string;
  detail: string;
  latitude: number;
  longitude: number;
};

export type MapPlace = {
  key: string;
  label: string;
  detail: string;
  latitude: number;
  longitude: number;
  weight: number;
  kind: "visit" | "charge" | "both";
};

const mapPlaceLimit = 40;

function markerAt(
  point: LngLat | undefined,
  marker: Omit<TripMarker, "longitude" | "latitude">,
): TripMarker[] {
  return point ? [{ ...marker, longitude: point[0], latitude: point[1] }] : [];
}

export function tripMarkers(
  trip: Trip,
  routes: Map<number, LngLat[]>,
  f: Formatter,
): TripMarker[] {
  const firstDrive = trip.drives[0];
  const lastDrive = trip.drives[trip.drives.length - 1];
  const stops = trip.stops.flatMap((stop, index) => {
    const [charge] = stop.charges;
    const charged: LngLat | undefined =
      charge && charge.longitude !== null && charge.latitude !== null
        ? [charge.longitude, charge.latitude]
        : undefined;
    const arrived = trip.legs[index].drives.at(-1);
    return markerAt(charged ?? (arrived && routes.get(arrived.id)?.at(-1)), {
      key: `stop-${index}`,
      kind: stop.charged ? "charge" : "stop",
      label: stop.place,
      detail: stopDetail(stop, f),
    });
  });
  return [
    ...markerAt(routes.get(firstDrive.id)?.[0], {
      key: "start",
      kind: "start",
      label: trip.from,
      detail: f.clock(trip.startAt),
    }),
    ...stops,
    ...markerAt(routes.get(lastDrive.id)?.at(-1), {
      key: "end",
      kind: "end",
      label: trip.to,
      detail: f.clock(trip.endAt),
    }),
  ];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function placesOnMap(
  visited: VisitedPlace[],
  charging: ChargingPlace[],
): MapPlace[] {
  const chargingKeys = new Set(charging.map((place) => place.key));
  const visitKeys = new Set(visited.map((place) => place.key));
  return [
    ...visited.slice(0, mapPlaceLimit).flatMap((place): MapPlace[] =>
      place.latitude === null || place.longitude === null
        ? []
        : [
            {
              key: place.key,
              label: place.label,
              detail: plural(place.visits, "visit", "visits"),
              latitude: place.latitude,
              longitude: place.longitude,
              weight: place.visits,
              kind: chargingKeys.has(place.key) ? "both" : "visit",
            },
          ],
    ),
    ...charging
      .filter((place) => !visitKeys.has(place.key))
      .flatMap((place): MapPlace[] =>
        place.latitude === null || place.longitude === null
          ? []
          : [
              {
                key: place.key,
                label: place.label,
                detail: plural(place.sessions, "charge", "charges"),
                latitude: place.latitude,
                longitude: place.longitude,
                weight: place.sessions,
                kind: "charge",
              },
            ],
      ),
  ];
}
