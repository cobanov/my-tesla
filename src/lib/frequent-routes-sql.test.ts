import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { frequentRoutesQuery } from "./frequent-routes-sql";
import type { RangeKind } from "./range-columns";
import { createSql } from "./sql-template";

let db: PGlite;
let sql: postgres.Sql;

const since = new Date("2026-09-01T00:00:00Z");

const cars = `
  insert into cars
    (id, eid, vid, vin, settings_id, efficiency, inserted_at, updated_at)
  values
    (1, 1, 1, 'VIN1', 1, 0.15, now(), now()),
    (2, 2, 2, 'VIN2', 2, 0.15, now(), now())
`;

const geofences = `
  insert into geofences (id, name, latitude, longitude, inserted_at, updated_at)
  values (1, 'Home', 33.4205, -111.94, now(), now())
`;

const addresses = `
  insert into addresses
    (id, name, road, house_number, city, inserted_at, updated_at)
  values
    (10, 'Office Tower', 'North Central Avenue', '200', 'Phoenix', now(), now()),
    (11, 'Parking Deck', 'North Central Avenue', null, 'Phoenix', now(), now()),
    (20, null, 'South Mill Avenue', '700', 'Tempe', now(), now()),
    (30, 'Farmers Market', 'West Main Street', null, 'Mesa', now(), now())
`;

const positions = `
  insert into positions (id, car_id, date, latitude, longitude)
  values
    (1, 1, '2026-10-01 06:10', 33.4205, -111.94),
    (2, 1, '2026-10-01 06:40', 33.4500, -112.0738),
    (3, 1, '2026-10-02 06:54', 33.4502, -112.0736),
    (4, 1, '2026-10-05 06:45', 33.4498, -112.0740),
    (5, 1, '2026-10-03 09:00', 33.415, -111.831),
    (6, 2, '2026-10-01 06:10', 33.4205, -111.94)
`;

type DriveSeed = {
  id: number;
  car?: number;
  start: string;
  end?: string | null;
  km: number;
  min: number;
  from: [position: number, address: number, geofence: number | null];
  to: [position: number, address: number, geofence: number | null];
  rated?: [start: number, end: number];
  ideal?: [start: number, end: number];
};

const home: DriveSeed["from"] = [1, 20, 1];
const office: DriveSeed["from"] = [2, 10, null];
const officeDeck: DriveSeed["from"] = [3, 11, null];
const officeStreet: DriveSeed["from"] = [4, 10, null];
const market: DriveSeed["from"] = [5, 30, null];
const otherHome: DriveSeed["from"] = [6, 20, 1];

const seeds: DriveSeed[] = [
  {
    id: 1,
    start: "2026-10-01 06:10",
    km: 24,
    min: 30,
    from: home,
    to: office,
    rated: [300, 276],
    ideal: [330, 300],
  },
  {
    id: 2,
    start: "2026-10-02 06:20",
    km: 24.2,
    min: 34,
    from: home,
    to: officeDeck,
    rated: [300, 275.8],
    ideal: [330, 299.75],
  },
  {
    id: 3,
    start: "2026-10-05 06:05",
    km: 24.4,
    min: 40,
    from: home,
    to: officeStreet,
    rated: [300, 275.6],
    ideal: [330, 299.5],
  },
  {
    id: 4,
    start: "2026-10-06 07:30",
    km: 25,
    min: 50,
    from: home,
    to: office,
    rated: [300, 100],
    ideal: [330, 110],
  },
  {
    id: 5,
    start: "2026-10-01 16:00",
    km: 24.1,
    min: 35,
    from: office,
    to: home,
  },
  {
    id: 6,
    start: "2026-10-02 16:10",
    km: 24.1,
    min: 33,
    from: officeDeck,
    to: home,
  },
  {
    id: 7,
    start: "2026-10-05 15:50",
    km: 24.1,
    min: 33,
    from: officeStreet,
    to: home,
  },
  { id: 8, start: "2026-10-03 08:00", km: 11, min: 20, from: home, to: market },
  { id: 9, start: "2026-10-04 08:00", km: 11, min: 21, from: home, to: market },
  {
    id: 10,
    start: "2026-10-07 06:00",
    km: 0.4,
    min: 3,
    from: home,
    to: office,
  },
  { id: 11, start: "2026-10-07 09:00", km: 12, min: 25, from: home, to: home },
  {
    id: 12,
    start: "2026-10-08 06:00",
    end: null,
    km: 24,
    min: 30,
    from: home,
    to: office,
  },
  {
    id: 13,
    start: "2026-08-01 06:00",
    km: 24,
    min: 30,
    from: home,
    to: office,
  },
  {
    id: 14,
    car: 2,
    start: "2026-10-01 06:00",
    km: 24,
    min: 31,
    from: otherHome,
    to: office,
  },
  {
    id: 15,
    car: 2,
    start: "2026-10-02 06:00",
    km: 24,
    min: 32,
    from: otherHome,
    to: office,
  },
  {
    id: 16,
    car: 2,
    start: "2026-10-03 06:00",
    km: 24,
    min: 33,
    from: otherHome,
    to: office,
  },
];

function driveTuple(seed: DriveSeed) {
  const end = seed.end === null ? "null" : `'${seed.end ?? seed.start}'`;
  const rated = seed.rated ?? [300, 276];
  const ideal = seed.ideal ?? [330, 300];
  return `(${[
    seed.id,
    seed.car ?? 1,
    `'${seed.start}'`,
    end,
    seed.km,
    seed.min,
    seed.from[0],
    seed.to[0],
    seed.from[1],
    seed.to[1],
    seed.from[2] ?? "null",
    seed.to[2] ?? "null",
    ...rated,
    ...ideal,
  ].join(", ")})`;
}

const drives = `
  insert into drives
    (id, car_id, start_date, end_date, distance, duration_min,
     start_position_id, end_position_id, start_address_id, end_address_id,
     start_geofence_id, end_geofence_id, start_rated_range_km,
     end_rated_range_km, start_ideal_range_km, end_ideal_range_km)
  values ${seeds.map(driveTuple).join(",\n    ")}
`;

function routes(carId: number, kind: RangeKind = "rated", limit = 8) {
  return frequentRoutesQuery(sql, {
    carId,
    since,
    timeZone: "Europe/Berlin",
    kind,
    limit,
  });
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  for (const statement of [cars, geofences, addresses, positions, drives]) {
    await db.exec(statement);
  }
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("frequentRoutesQuery", () => {
  test("groups the drives of one car by start and end place, most driven first", async () => {
    const rows = await routes(1);
    expect(rows.map((row) => [row.key, row.drives])).toEqual([
      ["g1>c7447:-20820", 4],
      ["c7447:-20820>g1", 3],
    ]);
  });

  test("counts parking spots in one cell as one place", async () => {
    const [toOffice] = await routes(1);
    expect(toOffice.from.geofence).toBe("Home");
    expect(toOffice.to).toEqual({
      geofence: null,
      name: "Office Tower",
      road: "North Central Avenue",
      houseNumber: "200",
      city: "Phoenix",
    });
  });

  test("gives the typical, the fastest, and the slowest drive", async () => {
    const [toOffice, toHome] = await routes(1);
    expect(toOffice.typicalKm).toBeCloseTo(24.3, 6);
    expect(toOffice.typicalMin).toBe(37);
    expect(toOffice.fastestMin).toBe(30);
    expect(toOffice.slowestMin).toBe(50);
    expect(toOffice.fastestId).toBe(1);
    expect(toOffice.slowestId).toBe(4);
    expect(toOffice.lastAt.toISOString()).toBe("2026-10-06T07:30:00.000Z");
    expect(toHome.typicalMin).toBe(33);
    expect(toHome.fastestId).toBe(7);
    expect(toHome.slowestId).toBe(5);
  });

  test("gives the usual departure hour in the time zone of the user", async () => {
    const [toOffice, toHome] = await routes(1);
    expect(toOffice.usualHour).toBe(8);
    expect(toHome.usualHour).toBe(18);
  });

  test("keeps an implausible consumption out of the average", async () => {
    const [rated] = await routes(1, "rated");
    const [ideal] = await routes(1, "ideal");
    expect(rated.whPerKm).toBeCloseTo(150, 6);
    expect(ideal.whPerKm).toBeCloseTo(187.5, 6);
  });

  test("keeps the limit and the rows of one car", async () => {
    expect(await routes(1, "rated", 1)).toHaveLength(1);
    const rows = await routes(2);
    expect(rows.map((row) => row.drives)).toEqual([3]);
  });
});
