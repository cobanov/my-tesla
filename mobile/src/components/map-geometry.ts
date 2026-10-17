import type { LngLat, MapMarker, MapPlace } from "@contract";

export type Bounds = [west: number, south: number, east: number, north: number];

const minimumSpan = 0.004;

function widened(low: number, high: number): [number, number] {
  const missing = minimumSpan - (high - low);
  return missing > 0 ? [low - missing / 2, high + missing / 2] : [low, high];
}

export function boundsOf(points: readonly LngLat[]): Bounds | null {
  if (!points.length) return null;
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const [west, east] = widened(
    Math.min(...longitudes),
    Math.max(...longitudes),
  );
  const [south, north] = widened(
    Math.min(...latitudes),
    Math.max(...latitudes),
  );
  return [west, south, east, north];
}

export function routeEnds(route: readonly LngLat[]): MapMarker[] {
  const start = route[0];
  const end = route.at(-1);
  if (!start || !end) return [];
  return [
    {
      key: "start",
      kind: "start",
      label: "Start",
      detail: "",
      longitude: start[0],
      latitude: start[1],
    },
    {
      key: "end",
      kind: "end",
      label: "End",
      detail: "",
      longitude: end[0],
      latitude: end[1],
    },
  ];
}

export function lines(routes: readonly LngLat[][]): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiLineString",
      coordinates: routes.map((route) => [...route]),
    },
  };
}

export function markerPoints(
  markers: readonly MapMarker[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature",
      properties: { kind: marker.kind },
      geometry: {
        type: "Point",
        coordinates: [marker.longitude, marker.latitude],
      },
    })),
  };
}

export function placeRadius(weight: number, heaviest: number): number {
  const size = 12 + Math.round(20 * Math.sqrt(weight / Math.max(1, heaviest)));
  return size / 2;
}

export function placePoints(
  places: readonly MapPlace[],
): GeoJSON.FeatureCollection {
  const heaviest = Math.max(1, ...places.map((place) => place.weight));
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      properties: {
        kind: place.kind,
        radius: placeRadius(place.weight, heaviest),
      },
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude],
      },
    })),
  };
}
