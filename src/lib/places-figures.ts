import type { ChargingPlace, VisitedPlace } from "./places-data";

const topPlaces = 10;

export function placesFigures(
  visited: VisitedPlace[],
  charging: ChargingPlace[],
) {
  const top = visited.slice(0, topPlaces);
  return {
    top,
    mostVisits: Math.max(1, ...top.map((place) => place.visits)),
    longest: [...visited].sort((a, b) => b.parkedS - a.parkedS)[0] ?? null,
    parkedTotal: visited.reduce((sum, place) => sum + place.parkedS, 0),
    arrivals: visited.reduce((sum, place) => sum + place.visits, 0),
    chargingKeys: new Set(charging.map((place) => place.key)),
    chargedTotal: charging.reduce((sum, place) => sum + place.addedKwh, 0),
    visitsByFence: new Map(
      visited
        .filter((place) => place.geofenceId !== null)
        .map((place) => [place.geofenceId, place]),
    ),
    chargesByFence: new Map(
      charging
        .filter((place) => place.geofenceId !== null)
        .map((place) => [place.geofenceId, place]),
    ),
  };
}
