import { describe, expect, test } from "bun:test";
import { boundsOf, placePoints, placeRadius, routeEnds } from "./map-geometry";

describe("boundsOf", () => {
  test("spans the points as west, south, east, north", () => {
    expect(
      boundsOf([
        [29.9, 40.7],
        [32.8, 39.9],
        [31.6, 41],
      ]),
    ).toEqual([29.9, 39.9, 32.8, 41]);
  });

  test("widens a single point to a street view and has no bounds for none", () => {
    const [west, south, east, north] = boundsOf([[29.92, 40.76]]) ?? [];
    expect(east! - west!).toBeCloseTo(0.004);
    expect(north! - south!).toBeCloseTo(0.004);
    expect(boundsOf([])).toBeNull();
  });
});

describe("routeEnds", () => {
  test("marks the first and the last point of a route", () => {
    expect(
      routeEnds([
        [29, 41],
        [30, 40.5],
        [31, 40],
      ]).map((marker) => [marker.kind, marker.longitude, marker.latitude]),
    ).toEqual([
      ["start", 29, 41],
      ["end", 31, 40],
    ]);
    expect(routeEnds([])).toEqual([]);
  });
});

describe("places", () => {
  test("size a place by its weight as the web does", () => {
    expect(placeRadius(20, 20)).toBe(16);
    expect(placeRadius(5, 20)).toBe(11);
    expect(placeRadius(0, 0)).toBe(6);
    const [home, shop] = placePoints([
      {
        key: "g1",
        label: "Home",
        detail: "20 visits",
        latitude: 40.76,
        longitude: 29.92,
        weight: 20,
        kind: "both",
      },
      {
        key: "c9",
        label: "Shop",
        detail: "5 charges",
        latitude: 40.8,
        longitude: 29.4,
        weight: 5,
        kind: "charge",
      },
    ]).features;
    expect(home?.properties).toEqual({ kind: "both", radius: 16 });
    expect(shop?.geometry).toEqual({
      type: "Point",
      coordinates: [29.4, 40.8],
    });
  });
});
