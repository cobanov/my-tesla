import { describe, expect, test } from "bun:test";
import { busiest, pickYear, yearWindow } from "./year-review";

const phoenix = "America/Phoenix";
const newYearUtc = new Date("2027-01-01T03:00:00Z");

describe("pickYear", () => {
  test("keeps a year from the address that has data", () => {
    expect(pickYear("2024", [2026, 2025, 2024], newYearUtc, phoenix)).toBe(
      2024,
    );
  });

  test("defaults to the current year in the time zone of the user", () => {
    expect(pickYear(undefined, [2027, 2026], newYearUtc, phoenix)).toBe(2026);
    expect(pickYear(undefined, [2027, 2026], newYearUtc, "UTC")).toBe(2027);
  });

  test("ignores a year without data or a value that is not a year", () => {
    expect(pickYear("2019", [2026, 2025], newYearUtc, phoenix)).toBe(2026);
    expect(pickYear("all", [2026, 2025], newYearUtc, phoenix)).toBe(2026);
  });

  test("falls back to the newest year when this year has no data yet", () => {
    expect(pickYear(undefined, [2025, 2023], newYearUtc, phoenix)).toBe(2025);
  });

  test("gives no year when the car has no data", () => {
    expect(pickYear("2026", [], newYearUtc, phoenix)).toBeNull();
  });
});

describe("yearWindow", () => {
  test("starts and ends at local midnight on the first of January", () => {
    const { from, to } = yearWindow(2026, phoenix);
    expect(from.toISOString()).toBe("2026-01-01T07:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T07:00:00.000Z");
  });

  test("uses the offset of the time zone at each end", () => {
    const { from, to } = yearWindow(2026, "Europe/Berlin");
    expect(from.toISOString()).toBe("2025-12-31T23:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });
});

describe("busiest", () => {
  test("takes the bucket with the most distance, the first one on a tie", () => {
    const buckets = [
      { at: 1, distanceKm: 120 },
      { at: 2, distanceKm: 300 },
      { at: 3, distanceKm: 300 },
    ];
    expect(busiest(buckets)?.at).toBe(2);
  });

  test("gives nothing without a distance", () => {
    expect(busiest([{ distanceKm: 0 }])).toBeNull();
    expect(busiest([])).toBeNull();
  });
});
