import { describe, expect, test } from "bun:test";
import type { LiveValues } from "../live/topics";
import { liveView } from "../live/view";
import {
  isCarEventId,
  settleMs,
  unlockedAlertMs,
  watchStep,
  type CarWatch,
} from "./events";

const parked: LiveValues = {
  locked: "true",
  is_user_present: "false",
  shift_state: "P",
  charging_state: "Disconnected",
  charge_limit_soc: "80",
  update_available: "false",
  tpms_soft_warning_fl: "false",
};

function settledWatch(values: LiveValues, now = 0): CarWatch {
  return watchStep("Rika", null, liveView(values), now - settleMs).watch;
}

function alertsFor(before: LiveValues, after: LiveValues) {
  return watchStep("Rika", settledWatch(before), liveView(after), 0).alerts;
}

describe("watchStep", () => {
  test("keeps the first view as the baseline", () => {
    const { alerts, watch } = watchStep(
      "Rika",
      null,
      liveView({ ...parked, charging_state: "Charging" }),
      1_000,
    );
    expect(alerts).toEqual([]);
    expect(watch.firstSeen).toBe(1_000);
  });

  test("stays quiet while the retained values arrive", () => {
    const first = watchStep("Rika", null, liveView({}), 0).watch;
    const { alerts } = watchStep(
      "Rika",
      first,
      liveView({ ...parked, charging_state: "Charging" }),
      settleMs - 1,
    );
    expect(alerts).toEqual([]);
  });

  test("names the start, the end, and a stop of a charge", () => {
    const charging = { ...parked, charging_state: "Charging" };
    expect(
      alertsFor({ ...parked, charging_state: "Stopped" }, charging),
    ).toEqual([{ event: "charging-started", body: "Rika charges to 80%." }]);
    expect(
      alertsFor(charging, { ...parked, charging_state: "Complete" }),
    ).toEqual([{ event: "charging-complete", body: "Rika reached 80%." }]);
    expect(
      alertsFor(charging, { ...parked, charging_state: "NoPower" }),
    ).toEqual([
      {
        event: "charging-stopped",
        body: "Rika stopped charging before 80%.",
      },
    ]);
  });

  test("ignores a charge state that first appears", () => {
    expect(
      alertsFor(
        { ...parked, charging_state: "" },
        { ...parked, charging_state: "Charging" },
      ),
    ).toEqual([]);
  });

  test("names a new software update and a new tire warning", () => {
    expect(
      alertsFor(parked, {
        ...parked,
        update_available: "true",
        update_version: "2026.38.4",
        tpms_soft_warning_fl: "true",
      }),
    ).toEqual([
      { event: "update-available", body: "Rika can install 2026.38.4." },
      { event: "tire-warning", body: "Rika warns about the front left tire." },
    ]);
  });

  test("sends one alert for a car left unlocked", () => {
    const unlocked = liveView({ ...parked, locked: "false" });
    let watch = watchStep("Rika", settledWatch(parked), unlocked, 0).watch;
    expect(watch.unlockedSince).toBe(0);
    const early = watchStep("Rika", watch, unlocked, unlockedAlertMs - 1);
    expect(early.alerts).toEqual([]);
    const late = watchStep("Rika", early.watch, unlocked, unlockedAlertMs);
    expect(late.alerts).toEqual([
      {
        event: "left-unlocked",
        body: "Rika has been unlocked for 10 minutes.",
      },
    ]);
    watch = late.watch;
    expect(
      watchStep("Rika", watch, unlocked, unlockedAlertMs * 2).alerts,
    ).toEqual([]);
    const locked = watchStep("Rika", watch, liveView(parked), unlockedAlertMs);
    expect(locked.watch).toMatchObject({
      unlockedSince: null,
      unlockedSent: false,
    });
  });

  test("does not count an unlocked car with someone inside", () => {
    const inside = liveView({
      ...parked,
      locked: "false",
      is_user_present: "true",
    });
    const { watch } = watchStep("Rika", settledWatch(parked), inside, 0);
    expect(watch.unlockedSince).toBeNull();
  });
});

describe("isCarEventId", () => {
  test("accepts only the listed events", () => {
    expect(isCarEventId("charging-complete")).toBe(true);
    expect(isCarEventId("sentry")).toBe(false);
    expect(isCarEventId(3)).toBe(false);
  });
});
