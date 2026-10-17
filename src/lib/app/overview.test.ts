import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { liveView } from "../live/view";
import { defaultPreferences } from "../preferences";
import type { Car, CarSnapshot } from "../queries";
import { overviewPage, type OverviewInput } from "./overview";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");
const now = new Date("2026-10-17T15:00:00Z");

const car: Car = {
  id: 2,
  name: "Rika",
  slug: "rika",
  model: "Y",
  marketingName: "SR",
  exteriorColor: "StealthGrey",
  wheelType: null,
  trimBadging: null,
  efficiencyKwhPerKm: 0.136,
};

const snapshot: CarSnapshot = {
  positionAt: new Date("2026-10-17T14:55:00Z"),
  latitude: 40.76,
  longitude: 29.92,
  batteryAt: null,
  batteryLevel: 62,
  usableBatteryLevel: 62,
  rangeKm: 271.4,
  odometerKm: 4286.7,
  outsideTemp: 18,
  insideTemp: 21,
  climateOn: false,
  tires: { frontLeft: 2.9, frontRight: 2.9, rearLeft: 2.5, rearRight: 2.9 },
  state: "online",
  stateSince: null,
  driving: false,
  charging: false,
  softwareVersion: "2026.20.300",
};

const input: OverviewInput = {
  car,
  image: "https://example.com/car.png",
  snapshot,
  lastDrive: null,
  lastCharge: null,
  today: null,
  live: null,
  leaks: [{ tire: "rearLeft", dropBar: 0.3, days: 5 }],
  show: defaultPreferences.overview,
  showMaps: true,
};

describe("overviewPage", () => {
  test("formats the battery, the stats, and the tires", () => {
    const page = overviewPage(input, f, now);
    expect(page.car).toEqual({
      id: 2,
      name: "Rika",
      variant: "Model Y SR · Stealth Grey",
      image: "https://example.com/car.png",
    });
    expect(page.activity).toEqual({
      label: "Online",
      tone: "active",
      updated: "Updated 5 min ago",
    });
    expect(page.battery).toMatchObject({
      level: 62,
      range: "271 km",
      caption: "Rated range",
      tone: "normal",
    });
    expect(page.stats.map((stat) => stat.value.text)).toEqual([
      "4,287 km",
      "18 °C",
      "21 °C",
      "2026.20.300",
    ]);
    expect(page.tires?.rearLeft.tone).toBe("bad");
    expect(page.tires?.warnings[0]).toContain("Rear left tire");
    expect(page.location?.lastSeen).toBe("Last seen today at 17:55");
  });

  test("shows the live tiles with the end of the charge as a time", () => {
    const view = liveView(
      {
        locked: "true",
        charging_state: "Charging",
        plugged_in: "true",
        time_to_full_charge: "2",
      },
      {},
      now.getTime(),
    );
    const page = overviewPage(
      { ...input, live: { connected: true, hasValues: true, view } },
      f,
      now,
    );
    const charging = page.live?.tiles.find((tile) => tile.key === "charging");
    expect(charging?.fullAt).toBe("2026-10-17T17:00:00.000Z");
    expect(page.battery?.caption).toBe("Charging");
    expect(page.battery?.fullAt).toBe("2026-10-17T17:00:00.000Z");
  });

  test("hides the cards that Settings turns off, and maps when hidden", () => {
    const page = overviewPage(
      {
        ...input,
        show: { ...defaultPreferences.overview, tires: false, render: false },
        showMaps: false,
      },
      f,
      now,
    );
    expect(page.tires).toBeNull();
    expect(page.car.image).toBeNull();
    expect(page.location).toBeNull();
  });

  test("explains a car without records", () => {
    const page = overviewPage(
      {
        ...input,
        snapshot: { ...snapshot, batteryLevel: null, positionAt: null },
      },
      f,
      now,
    );
    expect(page.empty).toContain("TeslaMate fills this page");
    expect(page.battery).toBeNull();
    expect(page.stats).toEqual([]);
  });
});
