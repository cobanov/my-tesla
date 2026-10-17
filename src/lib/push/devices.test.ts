import { describe, expect, test } from "bun:test";
import {
  alertMessages,
  alertUrl,
  deadTokens,
  isPushToken,
  parseDevice,
  parseDevices,
  withDevice,
  type PushDevice,
} from "./devices";

const token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
const other = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]";
const now = new Date("2026-10-17T12:00:00.000Z");

function device(events: PushDevice["events"], to = token): PushDevice {
  return { token: to, events, updatedAt: now.toISOString() };
}

describe("parseDevice", () => {
  test("takes a token and known events", () => {
    expect(
      parseDevice(
        { token, events: ["charging-complete", "charging-complete"] },
        now,
      ),
    ).toEqual(device(["charging-complete"]));
  });

  test("refuses unknown events and other tokens", () => {
    expect(parseDevice({ token, events: ["sentry"] }, now)).toBeNull();
    expect(parseDevice({ token: "abc", events: [] }, now)).toBeNull();
    expect(parseDevice({ token, events: "all" }, now)).toBeNull();
    expect(parseDevice(null, now)).toBeNull();
  });
});

describe("isPushToken", () => {
  test("accepts both Expo token prefixes", () => {
    expect(isPushToken(token)).toBe(true);
    expect(isPushToken("ExpoPushToken[abcdefghij12]")).toBe(true);
    expect(isPushToken("ExponentPushToken[a b]")).toBe(false);
  });
});

describe("parseDevices", () => {
  test("keeps the valid devices of a stored file", () => {
    expect(
      parseDevices({
        version: 1,
        devices: [device(["tire-warning"]), { token: "bad", events: [] }, null],
      }),
    ).toEqual([device(["tire-warning"])]);
    expect(parseDevices(null)).toEqual([]);
  });
});

describe("withDevice", () => {
  test("replaces a token, and drops it without events", () => {
    const list = [device(["tire-warning"]), device(["tire-warning"], other)];
    expect(withDevice(list, device(["left-unlocked"]))).toEqual([
      device(["tire-warning"], other),
      device(["left-unlocked"]),
    ]);
    expect(withDevice(list, device([]))).toEqual([
      device(["tire-warning"], other),
    ]);
  });
});

describe("alertMessages", () => {
  test("sends each alert to the devices that chose it", () => {
    const messages = alertMessages(
      [device(["charging-complete"]), device(["tire-warning"], other)],
      2,
      [{ event: "charging-complete", body: "Rika reached 80%." }],
    );
    expect(messages).toEqual([
      {
        to: token,
        title: "Charging complete",
        body: "Rika reached 80%.",
        data: { event: "charging-complete", carId: 2, url: "/charging" },
        sound: "default",
        priority: "high",
        channelId: "charging-complete",
      },
    ]);
  });
});

describe("alertUrl", () => {
  test("opens Charging for a charge alert and Overview for the others", () => {
    expect(alertUrl("charging-stopped")).toBe("/charging");
    expect(alertUrl("left-unlocked")).toBe("/");
  });
});

describe("deadTokens", () => {
  test("names the tokens that Expo no longer knows", () => {
    const messages = alertMessages(
      [device(["tire-warning"]), device(["tire-warning"], other)],
      1,
      [{ event: "tire-warning", body: "Check the tires." }],
    );
    expect(
      deadTokens(messages, [
        { status: "ok", id: "1" },
        {
          status: "error",
          message: "gone",
          details: { error: "DeviceNotRegistered" },
        },
      ]),
    ).toEqual([other]);
  });
});
