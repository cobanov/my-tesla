import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { dayWindow } from "../insights";
import { defaultPreferences } from "../preferences";
import { timelinePage } from "./timeline";

const f = createFormatter(defaultPreferences, "UTC");
const now = new Date("2026-10-18T20:00:00Z");
const at = (time: string) => new Date(`2026-10-17T${time}:00Z`);

const records = {
  states: [{ state: "asleep" as const, start: at("00:00"), end: at("08:00") }],
  drives: [
    {
      id: 7,
      start: at("08:00"),
      end: at("08:30"),
      from: "Home",
      to: "Office",
      distanceKm: 20,
    },
  ],
  charges: [
    {
      id: 9,
      start: at("18:00"),
      end: at("19:00"),
      place: "Home",
      energyAddedKwh: 12.5,
      fast: false,
    },
  ],
};

describe("timelinePage", () => {
  test("lists the day with links, totals, and the day around it", () => {
    const window = dayWindow("2026-10-17", "UTC");
    const page = timelinePage(
      records,
      "2026-10-17",
      "2026-10-18",
      window,
      f,
      now,
    );
    expect(page.title).toBe("Yesterday");
    expect(page.previous).toBe("2026-10-16");
    expect(page.next).toBe("2026-10-18");
    expect(page.stats.map((stat) => stat.value.text)).toEqual([
      "20 km",
      f.duration(30),
      "12.5 kWh",
      expect.stringMatching(/%$/),
    ]);
    const drive = page.rows.find((row) => row.kind === "drive");
    expect(drive).toMatchObject({
      title: "Drive to Office",
      target: { kind: "drive", id: 7 },
    });
    expect(page.rows.find((row) => row.kind === "charge")).toMatchObject({
      title: "Charged at Home",
      target: { kind: "charge", id: 9 },
    });
    expect(page.strip.segments.length).toBeGreaterThan(0);
  });

  test("has no next day on today", () => {
    const page = timelinePage(
      { states: [], drives: [], charges: [] },
      "2026-10-18",
      "2026-10-18",
      dayWindow("2026-10-18", "UTC"),
      f,
      now,
    );
    expect(page.next).toBeNull();
    expect(page.rows).toEqual([]);
  });
});
