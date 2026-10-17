import { describe, expect, test } from "bun:test";
import {
  areaPath,
  baselineValue,
  linePath,
  nearestIndex,
  scale,
} from "./chart-geometry";

describe("scale", () => {
  test("maps a value from a domain to a range", () => {
    expect(scale(50, [0, 100], [200, 0])).toBe(100);
    expect(scale(5, [5, 5], [10, 20])).toBe(10);
  });
});

describe("linePath", () => {
  test("breaks the line at a missing value", () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: null },
        { x: 3, y: 5 },
      ]),
    ).toBe("M0.0,10.0L1.0,20.0M3.0,5.0");
  });
});

describe("areaPath", () => {
  test("closes each run of values down to the baseline", () => {
    expect(
      areaPath(
        [
          { x: 0, y: 10 },
          { x: 2, y: 20 },
        ],
        100,
      ),
    ).toBe("M0.0,10.0L2.0,20.0L2.0,100.0L0.0,100.0Z");
  });
});

describe("nearestIndex and baselineValue", () => {
  test("finds the closest point and keeps zero inside the domain", () => {
    expect(nearestIndex([0, 10, 20], 13)).toBe(1);
    expect(baselineValue([-10, 30])).toBe(0);
    expect(baselineValue([20, 60])).toBe(20);
  });
});
