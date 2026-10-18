import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { defaultPreferences } from "../preferences";
import type { Car } from "../queries";
import { yearPage, type YearInput } from "./year";

const f = createFormatter(defaultPreferences, "America/Phoenix");
const now = new Date("2026-10-18T12:00:00Z");

const car: Car = {
  id: 2,
  name: "Juniper",
  slug: "juniper",
  model: "Y",
  marketingName: null,
  exteriorColor: null,
  wheelType: null,
  trimBadging: null,
  efficiencyKwhPerKm: 0.136,
  lfpBattery: false,
  modelYear: null,
};

const bucket = (at: string, distanceKm: number) => ({
  at: new Date(at),
  distanceKm,
  minutes: distanceKm,
  usedKwh: distanceKm / 7,
  chargedKwh: 0,
  cost: null,
  outsideC: null,
  cabinC: null,
});

const input: YearInput = {
  years: [2026, 2025],
  year: 2026,
  window: {
    from: new Date("2026-01-01T07:00:00Z"),
    to: new Date("2027-01-01T07:00:00Z"),
  },
  drives: {
    drives: 3,
    distanceKm: 300,
    minutes: 300,
    usedKwh: 42,
    speedMaxKmh: 120,
    longestKm: 200,
  },
  charges: { sessions: 1, addedKwh: 40, cost: 10, estimatedCosts: 0 },
  months: [
    bucket("2026-08-01T07:00:00Z", 100),
    bucket("2026-09-01T07:00:00Z", 200),
  ],
  days: [
    bucket("2026-09-07T07:00:00Z", 200),
    bucket("2026-08-02T07:00:00Z", 100),
  ],
  longest: [
    {
      id: 77,
      startAt: new Date("2026-09-07T15:00:00Z"),
      distanceKm: 200,
      durationMin: 130,
      from: "Home",
      to: "Flagstaff",
    },
  ],
  charge: {
    id: 9,
    startAt: new Date("2026-09-07T18:00:00Z"),
    addedKwh: 40,
    cost: 10,
    place: "Supercharger Flagstaff",
  },
  visited: [
    {
      key: "g1",
      label: "Home",
      city: "Tempe",
      geofenceId: 1,
      visits: 3,
      parkedS: 3600,
      lastAt: now,
      latitude: null,
      longitude: null,
    },
  ],
};

describe("yearPage", () => {
  test("gives the totals, the months, the records with links, and the places", () => {
    const page = yearPage(input, car, f, now);
    expect(page.year).toBe(2026);
    expect(page.years).toEqual([2026, 2025]);
    expect(page.subtitle).toStartWith("1 Jan");
    expect(page.hero[0]).toMatchObject({ label: "Distance" });
    const panels = page.sections[0]?.panels ?? [];
    expect(panels.map((panel) => panel.title)).toEqual([
      "Distance (km)",
      "Records",
      "Top places",
    ]);
    expect(panels[0]?.blocks[0]?.kind).toBe("chart");
    expect(panels[1]?.blocks[0]).toMatchObject({
      kind: "records",
      rows: [
        { key: "month", title: "Busiest month: September" },
        { key: "day", target: { kind: "day", day: "2026-09-07" } },
        { key: "drive", target: { kind: "drive", id: 77 } },
        { key: "charge", target: { kind: "charge", id: 9 } },
      ],
    });
    expect(panels[2]?.blocks[0]).toMatchObject({
      kind: "records",
      rows: [{ title: "Home", value: "3 visits" }],
    });
  });

  test("says so when the car has no year yet", () => {
    const page = yearPage(
      { ...input, years: [], year: null, window: null },
      car,
      f,
      now,
    );
    expect(page.subtitle).toBe("No drive or charge yet.");
    expect(page.sections).toEqual([]);
  });
});
