import { describe, expect, test } from "bun:test";
import {
  capRoutes,
  drivenRoads,
  routeBounds,
  sampleRoute,
  thinRoute,
  type LngLat,
} from "./route";

const line = (count: number): LngLat[] =>
  Array.from({ length: count }, (_, index) => [29 + index / 1000, 40]);

describe("sampleRoute", () => {
  test("keeps a short route unchanged", () => {
    const route = line(10);
    expect(sampleRoute(route, 20)).toBe(route);
  });

  test("reduces a long route and keeps the first and last point", () => {
    const route = line(2001);
    const sampled = sampleRoute(route, 500);
    expect(sampled).toHaveLength(500);
    expect(sampled[0]).toEqual(route[0]);
    expect(sampled.at(-1)).toEqual(route.at(-1));
  });

  test("keeps the order of the points", () => {
    const sampled = sampleRoute(line(1000), 50);
    const longitudes = sampled.map(([lng]) => lng);
    expect(longitudes).toEqual([...longitudes].sort((a, b) => a - b));
  });
});

describe("routeBounds", () => {
  test("gives no bounds for an empty route", () => {
    expect(routeBounds([])).toBeNull();
  });

  test("finds the south-west and north-east corners", () => {
    expect(
      routeBounds([
        [29.1, 40.9],
        [28.9, 41.2],
        [29.3, 40.7],
      ]),
    ).toEqual([
      [28.9, 40.7],
      [29.3, 41.2],
    ]);
  });
});

const metersNorth = (meters: number): LngLat => [
  -111.94,
  33.42 + meters / 111_320,
];

describe("thinRoute", () => {
  test("drops points closer than the spacing to the last kept point", () => {
    const route = [0, 10, 20, 60, 70, 130, 135].map(metersNorth);
    expect(thinRoute(route, 50)).toEqual([0, 60, 130, 135].map(metersNorth));
  });

  test("keeps the first and the last point of a car that stood still", () => {
    const route = [0, 0, 0, 0].map(metersNorth);
    expect(thinRoute(route, 50)).toEqual([metersNorth(0), metersNorth(0)]);
  });

  test("measures east and west by the latitude", () => {
    const east = (meters: number, latitude: number): LngLat => [
      meters / (111_320 * Math.cos((latitude * Math.PI) / 180)),
      latitude,
    ];
    const route = [east(0, 60), east(40, 60), east(80, 60)];
    expect(thinRoute(route, 50)).toEqual([east(0, 60), east(80, 60)]);
  });
});

describe("capRoutes", () => {
  test("keeps routes under the limit unchanged", () => {
    const routes = [line(10), line(20)];
    expect(capRoutes(routes, 30)).toBe(routes);
  });

  test("thins each route by the same share and keeps its ends", () => {
    const routes = [line(1000), line(100), line(10)];
    const capped = capRoutes(routes, 300);
    expect(capped.map((route) => route.length)).toEqual([270, 27, 2]);
    capped.forEach((route, index) => {
      expect(route[0]).toEqual(routes[index][0]);
      expect(route.at(-1)).toEqual(routes[index].at(-1));
    });
  });

  test("leaves out the shortest drives when the limit is tight", () => {
    const capped = capRoutes([line(400), line(50), line(5)], 100);
    expect(capped.map((route) => route.length)).toEqual([87, 10]);
  });
});

describe("drivenRoads", () => {
  const point = (driveId: number, meters: number) => {
    const [lng, lat] = metersNorth(meters);
    return { driveId, lng, lat };
  };

  test("draws one road for each drive, in the order of the points", () => {
    const roads = drivenRoads([
      point(1, 0),
      point(1, 100),
      point(1, 200),
      point(2, 1000),
      point(2, 1100),
    ]);
    expect(roads).toEqual([
      [0, 100, 200].map(metersNorth),
      [1000, 1100].map(metersNorth),
    ]);
  });

  test("leaves out a drive with a single point", () => {
    expect(drivenRoads([point(1, 0), point(2, 0), point(2, 500)])).toEqual([
      [0, 500].map(metersNorth),
    ]);
  });

  test("keeps the whole map under the point limit", () => {
    const points = Array.from({ length: 20 }, (_, drive) =>
      Array.from({ length: 100 }, (_, step) => point(drive, step * 100)),
    ).flat();
    const roads = drivenRoads(points, 500);
    expect(roads).toHaveLength(20);
    expect(
      roads.reduce((sum, road) => sum + road.length, 0),
    ).toBeLessThanOrEqual(500);
  });
});
