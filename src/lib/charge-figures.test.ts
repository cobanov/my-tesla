import { describe, expect, test } from "bun:test";
import { chargeFigures, powerByLevel } from "./charge-figures";
import { createFormatter } from "./format";
import { defaultPreferences } from "./preferences";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");

const session = {
  fast: true,
  brand: "Tesla",
  phases: null,
  energyAddedKwh: 40,
  energyUsedKwh: 44,
  billedKwh: 44,
  durationMin: 30,
  startLevel: 20,
  endLevel: 80,
  startRangeKm: 90,
  endRangeKm: 360,
  cost: 440,
  costEstimated: false,
  costBasis: "recorded" as const,
  billingType: null,
  costPerUnit: null,
  sessionFee: null,
  cable: "IEC",
  batteryHeater: false,
};

describe("powerByLevel", () => {
  test("averages the power at each battery level", () => {
    expect(
      powerByLevel([
        { level: 21, power: 150 },
        { level: 20, power: 120 },
        { level: 20, power: 125 },
        { level: null, power: 90 },
        { level: 22, power: null },
      ]),
    ).toEqual([
      { level: 20, power: 122.5 },
      { level: 21, power: 150 },
    ]);
  });
});

describe("chargeFigures", () => {
  test("derives the power, the efficiency, the range, and the cost parts", () => {
    const figures = chargeFigures(session, f);
    expect(figures.averagePower).toBe(80);
    expect(figures.efficiency).toBeCloseTo(90.9, 1);
    expect(figures.rangeAdded).toBe(270);
    expect(figures.levelsAdded).toBe(60);
    expect(figures.kind).toBe("Tesla DC fast charge");
    expect(figures.costSource).toBe("Recorded in TeslaMate");
    expect(figures.breakdown?.perKwhBilled).toBe(10);
  });

  test("names an AC charge with its phases and an estimated cost", () => {
    const figures = chargeFigures(
      {
        ...session,
        fast: false,
        phases: 3,
        costEstimated: true,
        costBasis: "price",
        cost: null,
      },
      f,
    );
    expect(figures.kind).toBe("AC, 3 phase");
    expect(figures.costSource).toBe("Estimate from your price");
    expect(figures.estimatedFrom).toBe("settings");
    expect(figures.perKwhSource).toBe("Your price");
    expect(figures.breakdown).toBeNull();
  });

  test("shows free Supercharging without a cost breakdown", () => {
    const figures = chargeFigures(
      { ...session, cost: 0, costBasis: "free" },
      f,
    );
    expect(figures.costSource).toBe("Free Supercharging");
    expect(figures.estimatedFrom).toBeNull();
    expect(figures.breakdown).toBeNull();
  });

  test("gives the geofence tariff and its estimate", () => {
    const figures = chargeFigures(
      {
        ...session,
        cost: 16.5,
        costEstimated: true,
        costBasis: "per_minute",
        billingType: "per_minute",
        costPerUnit: 0.25,
        sessionFee: 1.5,
      },
      f,
    );
    expect(figures.costSource).toBe("Estimate from the geofence price");
    expect(figures.estimatedFrom).toBe("geofence");
    expect(figures.perKwhSource).toBe("Cost ÷ energy billed");
    expect(figures.tariff).toBe(
      `${f.cost(0.25)} per minute + ${f.cost(1.5)} per session`,
    );
    expect(
      chargeFigures({ ...session, billingType: "per_kwh", costPerUnit: 0.3 }, f)
        .tariff,
    ).toBe(`${f.cost(0.3)} per kWh`);
    expect(figures.breakdown?.perKwhBilled).toBeCloseTo(16.5 / 44, 6);
  });

  test("names the cable and the battery heater", () => {
    expect(chargeFigures(session, f).cable).toBe("IEC (Type 2)");
    expect(chargeFigures(session, f).batteryHeater).toBe("Not used");
    const other = chargeFigures(
      { ...session, cable: "Tesla", batteryHeater: true },
      f,
    );
    expect(other.cable).toBe("Tesla");
    expect(other.batteryHeater).toBe("Used");
    const unknown = chargeFigures(
      { ...session, cable: null, batteryHeater: null },
      f,
    );
    expect(unknown.cable).toBeNull();
    expect(unknown.batteryHeater).toBeNull();
  });
});
