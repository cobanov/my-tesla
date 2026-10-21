import { describe, expect, test } from "bun:test";
import {
  calendarFeed,
  chargeEvent,
  driveEvent,
  foldLine,
  icsStamp,
} from "./calendar";
import { createFormatter } from "./format";
import { defaultPreferences } from "./preferences";
import type { Charge, Drive } from "./queries";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");
const now = new Date("2026-10-18T12:00:00Z");

const drive = {
  id: 7,
  startAt: new Date("2026-10-17T08:00:00Z"),
  endAt: new Date("2026-10-17T08:45:00Z"),
  from: "Home",
  to: "Office, Floor 3; Gate B",
  distanceKm: 42.3,
  durationMin: 45,
  efficiencyWhPerKm: 152,
} as Drive;

const charge = {
  id: 9,
  startAt: new Date("2026-10-17T18:00:00Z"),
  endAt: new Date("2026-10-17T19:00:00Z"),
  place: "Home",
  energyAddedKwh: 30.5,
  startLevel: 40,
  endLevel: 80,
  cost: 6.1,
} as Charge & { endAt: Date };

describe("icsStamp", () => {
  test("writes UTC without separators or milliseconds", () => {
    expect(icsStamp(new Date("2026-10-17T08:05:09.123Z"))).toBe(
      "20261017T080509Z",
    );
  });
});

describe("foldLine", () => {
  test("keeps each line at 75 octets, without splitting a character", () => {
    const line = `SUMMARY:${"é".repeat(80)}`;
    const parts = foldLine(line).split("\r\n");
    const encoder = new TextEncoder();
    expect(parts.every((part) => encoder.encode(part).length <= 75)).toBe(true);
    expect(parts.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(
      parts.map((part, index) => (index ? part.slice(1) : part)).join(""),
    ).toBe(line);
    expect(foldLine("SHORT")).toBe("SHORT");
  });
});

describe("calendarFeed", () => {
  test("writes one event for each drive and charge, escaped, with CRLF", () => {
    const feed = calendarFeed(
      "Juniper, drives",
      [
        driveEvent(
          drive,
          2,
          f,
          "https://tesla.example.com/cars/juniper/drives/7",
        ),
        chargeEvent(charge, 2, f, null),
      ],
      now,
    );
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(feed.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
    expect(feed).toContain("X-WR-CALNAME:Juniper\\, drives\r\n");
    expect(feed).toContain("UID:drive-2-7@my-tesla\r\n");
    expect(feed).toContain("DTSTART:20261017T080000Z\r\n");
    expect(feed).toContain("DTEND:20261017T084500Z\r\n");
    expect(feed).toContain("SUMMARY:Home → Office\\, Floor 3\\; Gate B\r\n");
    expect(feed).toContain(
      "URL:https://tesla.example.com/cars/juniper/drives/7\r\n",
    );
    expect(feed).toContain("UID:charge-2-9@my-tesla\r\n");
    expect(feed).toContain("SUMMARY:Charge at Home\r\n");
    expect(feed).toContain(
      `DESCRIPTION:+${f.energy(30.5)} · 40% → 80% · ${f.cost(6.1)}`.replace(
        /,/g,
        "\\,",
      ),
    );
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});
