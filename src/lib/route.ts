export type LngLat = [number, number];

const maxRoutePoints = 500;

export function sampleRoute(points: LngLat[], max = maxRoutePoints): LngLat[] {
  if (points.length <= max) return points;
  if (max < 2) return points.slice(0, Math.max(0, max));
  const step = (points.length - 1) / (max - 1);
  return Array.from(
    { length: max },
    (_, index) => points[Math.round(index * step)],
  );
}

export function routeBounds(points: LngLat[]): [LngLat, LngLat] | null {
  if (!points.length) return null;
  let [west, south] = points[0];
  let [east, north] = points[0];
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

export const drivenPointLimit = 10_000;
const drivenPointSpacingM = 50;
const metersPerDegree = 111_320;

function metersApart([lngA, latA]: LngLat, [lngB, latB]: LngLat): number {
  const east = (lngB - lngA) * Math.cos((((latA + latB) / 2) * Math.PI) / 180);
  return Math.hypot(east, latB - latA) * metersPerDegree;
}

export function thinRoute(route: LngLat[], minMeters: number): LngLat[] {
  if (route.length <= 2) return route;
  const kept = [route[0]];
  for (const point of route.slice(1, -1)) {
    if (metersApart(kept[kept.length - 1], point) >= minMeters) {
      kept.push(point);
    }
  }
  return [...kept, route[route.length - 1]];
}

export function capRoutes(routes: LngLat[][], limit: number): LngLat[][] {
  const total = routes.reduce((sum, route) => sum + route.length, 0);
  if (total <= limit) return routes;
  const share = limit / total;
  return routes
    .map((route) => sampleRoute(route, Math.floor(route.length * share)))
    .filter((route) => route.length > 1);
}

export function drivenRoads(
  points: { driveId: number; lng: number; lat: number }[],
  limit = drivenPointLimit,
): LngLat[][] {
  const byDrive = new Map<number, LngLat[]>();
  for (const { driveId, lng, lat } of points) {
    const route = byDrive.get(driveId) ?? [];
    route.push([lng, lat]);
    byDrive.set(driveId, route);
  }
  const roads = [...byDrive.values()]
    .map((route) => thinRoute(route, drivenPointSpacingM))
    .filter((route) => route.length > 1);
  return capRoutes(roads, limit);
}
