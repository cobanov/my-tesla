import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { createSql } from "./sql-template";
import {
  chargeLevelTrendQuery,
  odometerTrendQuery,
  rangeByLevelQuery,
  rangeByTemperatureQuery,
  stateTimesQuery,
} from "./trends-sql";

let db: PGlite;
let sql: postgres.Sql;

const since = new Date("2026-10-01T00:00:00Z");
const until = new Date("2026-10-05T00:00:00Z");

const positions = `
  insert into positions
    (id, car_id, date, latitude, longitude, battery_level, usable_battery_level,
     ideal_battery_range_km, rated_battery_range_km, outside_temp)
  values
    (1, 1, '2026-09-30 12:00', 0, 0, 90, 90, 477, 450, 20),
    (2, 1, '2026-10-01 00:00', 0, 0, 80, 80, 424, 400, 20.4),
    (3, 1, '2026-10-01 06:00', 0, 0, 60, 58, 318, 300, 4.6),
    (4, 1, '2026-10-01 12:00', 0, 0, 70, null, null, null, 20),
    (5, 1, '2026-10-03 00:00', 0, 0, 50, 50, 265, 250, 19.6),
    (6, 1, '2026-10-03 12:00', 0, 0, 40, 40, 212, 200, null),
    (7, 2, '2026-10-02 00:00', 0, 0, 10, 10, 53, 50, 20)
`;

const charges = `
  insert into charging_processes (id, car_id, position_id, start_date)
  values
    (1, 1, 2, '2026-10-02 00:00'),
    (2, 2, 7, '2026-10-02 00:00'),
    (3, 1, 1, '2026-09-30 10:00');
  insert into charges
    (id, charging_process_id, date, battery_level, usable_battery_level,
     charge_energy_added, charger_power, ideal_battery_range_km,
     rated_battery_range_km, outside_temp)
  values
    (1, 1, '2026-10-02 00:10', 50, 50, 0, 11, 265, 250, 20.2),
    (2, 1, '2026-10-02 00:40', 60, null, 5, 11, 318, 300, 19.8),
    (3, 2, '2026-10-02 00:10', 20, 20, 0, 11, 106, 100, 20),
    (4, 3, '2026-09-30 10:10', 30, 30, 0, 11, 159, 150, 20)
`;

const drives = `
  insert into drives (id, car_id, start_date, end_date, start_km, end_km)
  values
    (1, 1, '2026-10-01 08:00', '2026-10-01 09:00', 1000, 1040),
    (2, 1, '2026-10-02 08:00', '2026-10-02 09:00', 1040, 1100),
    (3, 1, '2026-09-30 08:00', '2026-09-30 09:00', 900, 950),
    (4, 2, '2026-10-02 08:00', '2026-10-02 09:00', 5000, 5100),
    (5, 1, '2026-10-04 08:00', null, 1100, null)
`;

const states = `
  insert into states (id, car_id, state, start_date, end_date)
  values
    (1, 1, 'online', '2026-09-29 00:00', '2026-09-30 20:00'),
    (2, 1, 'asleep', '2026-09-30 20:00', '2026-10-01 06:00'),
    (3, 1, 'online', '2026-10-01 06:00', '2026-10-01 08:00'),
    (4, 1, 'offline', '2026-10-01 08:00', '2026-10-02 08:00'),
    (5, 1, 'online', '2026-10-02 08:00', '2026-10-02 10:00'),
    (6, 1, 'asleep', '2026-10-02 10:00', null),
    (7, 2, 'online', '2026-10-01 00:00', null)
`;

const hour = 3600;

async function list<Row>(query: PromiseLike<Row[]>): Promise<Row[]> {
  return query;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(positions);
  await db.exec(charges);
  await db.exec(drives);
  await db.exec(states);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("chargeLevelTrendQuery", () => {
  test("averages the positions with a range into at most the given points", async () => {
    expect(await list(chargeLevelTrendQuery(sql, 1, since, 2))).toEqual([
      { at: new Date("2026-10-01T03:00:00Z"), level: 70, usableLevel: 69 },
      { at: new Date("2026-10-03T06:00:00Z"), level: 45, usableLevel: 45 },
    ]);
  });

  test("keeps each position when the points outnumber them", async () => {
    const rows = await chargeLevelTrendQuery(sql, 1, since);
    expect(rows.map((row) => row.level)).toEqual([80, 60, 50, 40]);
  });
});

describe("odometerTrendQuery", () => {
  test("takes the highest reading of each slice of the period", async () => {
    expect(await list(odometerTrendQuery(sql, 1, since, 2))).toEqual([
      { at: new Date("2026-10-02T09:00:00Z"), km: 1100 },
      { at: new Date("2026-10-04T08:00:00Z"), km: 1100 },
    ]);
  });

  test("uses the start and the end of each drive of the car", async () => {
    const rows = await odometerTrendQuery(sql, 1, since);
    expect(rows.map((row) => row.km)).toEqual([1000, 1040, 1040, 1100, 1100]);
  });
});

describe("rangeByTemperatureQuery", () => {
  test("sums positions and charge samples for each whole degree", async () => {
    expect(await list(rangeByTemperatureQuery(sql, 1, since, "rated"))).toEqual(
      [
        { value: 5, samples: 1, rangeKm: 300, level: 60, usableLevel: 58 },
        { value: 20, samples: 4, rangeKm: 1200, level: 240, usableLevel: 240 },
      ],
    );
  });

  test("reads the ideal range when the setting asks for it", async () => {
    const rows = await rangeByTemperatureQuery(sql, 1, since, "ideal");
    expect(rows.map((row) => row.rangeKm)).toEqual([318, 1272]);
  });
});

describe("rangeByLevelQuery", () => {
  test("sums the samples for each battery level, also without a temperature", async () => {
    expect(await list(rangeByLevelQuery(sql, 1, since, "rated"))).toEqual([
      { value: 40, samples: 1, rangeKm: 200, level: 40, usableLevel: 40 },
      { value: 50, samples: 2, rangeKm: 500, level: 100, usableLevel: 100 },
      { value: 60, samples: 2, rangeKm: 600, level: 120, usableLevel: 118 },
      { value: 80, samples: 1, rangeKm: 400, level: 80, usableLevel: 80 },
    ]);
  });
});

describe("stateTimesQuery", () => {
  test("cuts each state to the period and runs an open state to its end", async () => {
    const rows = await list(stateTimesQuery(sql, 1, since, until));
    expect(rows).toEqual([
      { state: "asleep", seconds: 6 * hour + 62 * hour },
      { state: "offline", seconds: 24 * hour },
      { state: "online", seconds: 4 * hour },
    ]);
  });

  test("leaves out the states after the end", async () => {
    const rows = await list(
      stateTimesQuery(sql, 1, since, new Date("2026-10-02T09:00:00Z")),
    );
    expect(rows).toEqual([
      { state: "asleep", seconds: 6 * hour },
      { state: "offline", seconds: 24 * hour },
      { state: "online", seconds: 3 * hour },
    ]);
  });
});
