import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { defaultPreferences } from "../preferences";
import { liveNotices, liveTiles } from "./tiles";
import { liveView } from "./view";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");

const parked = {
  locked: "true",
  sentry_mode: "true",
  is_user_present: "false",
  doors_open: "false",
  plugged_in: "true",
  charging_state: "Charging",
  charger_power: "11",
  charge_limit_soc: "80",
  time_to_full_charge: "1.5",
  is_climate_on: "false",
  inside_temp: "21",
  version: "2026.20.300",
  update_available: "false",
};

describe("liveTiles", () => {
  test("describes a locked car that charges", () => {
    const tiles = liveTiles(liveView(parked, {}, 0), f);
    expect(tiles.map((tile) => [tile.key, tile.title, tile.detail])).toEqual([
      ["lock", "Locked", "Sentry Mode on"],
      ["openings", "All closed", "Doors, windows, and trunks"],
      ["charging", "Charging", "11 kW · Limit 80%"],
      ["climate", "Climate off", "Cabin 21 °C"],
      ["software", "Up to date", "2026.20.300"],
    ]);
    expect(tiles[2]).toMatchObject({ icon: "plug-zap", tone: "charge" });
    expect(tiles[2]?.fullAt?.getTime()).toBe(1.5 * 3_600_000);
  });

  test("warns about an unlocked car with an open door", () => {
    const tiles = liveTiles(
      liveView({
        ...parked,
        locked: "false",
        driver_front_door_open: "true",
        doors_open: "true",
      }),
      f,
    );
    expect(tiles[0]).toMatchObject({ icon: "lock-open", tone: "warning" });
    expect(tiles[1]).toMatchObject({
      title: "Driver door open",
      tone: "warning",
    });
  });
});

describe("liveNotices", () => {
  test("names an offline feed and a tire warning", () => {
    expect(
      liveNotices({
        connected: false,
        view: liveView({ ...parked, tpms_soft_warning_fl: "true" }),
      }),
    ).toEqual([
      "The live feed is offline. The values can be old.",
      "Check the tire pressure: front left.",
    ]);
  });
});
