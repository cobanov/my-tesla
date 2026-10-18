import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { noPrices, type ChargePrices } from "./charge-cost";
import { chargeSessionsRelation } from "./charge-sessions-sql";
import { demoSchema } from "./demo/schema";
import { createSql } from "./sql-template";
import { biggestChargeQuery, dataYearsQuery } from "./year-review-sql";

let db: PGlite;
let sql: postgres.Sql;

const phoenix = "America/Phoenix";
const year2025 = {
  from: new Date("2025-01-01T07:00:00Z"),
  to: new Date("2026-01-01T07:00:00Z"),
};

const drives = `
  insert into drives (id, car_id, start_date, end_date, distance)
  values
    (1, 2, '2024-06-01 10:00', '2024-06-01 11:00', 40),
    (2, 2, '2026-01-01 03:00', '2026-01-01 04:00', 12),
    (3, 2, '2026-03-01 10:00', null, null),
    (4, 1, '2023-05-01 10:00', '2023-05-01 11:00', 30)
`;

const addresses = `
  insert into addresses (id, name, road, city, inserted_at, updated_at)
  values (10, 'Supercharger', 'Main Street', 'Tempe', now(), now())
`;

const geofences = `
  insert into geofences (id, name, latitude, longitude, inserted_at, updated_at)
  values (1, 'Home', 33.42, -111.94, now(), now())
`;

const processes = `
  insert into charging_processes
    (id, car_id, position_id, address_id, geofence_id, start_date, end_date,
     charge_energy_added, charge_energy_used, cost)
  values
    (1, 2, 1, 10, null, '2025-04-01 10:00', '2025-04-01 11:00', 50, 52, 20.00),
    (2, 2, 1, 10, 1, '2025-08-01 10:00', '2025-08-01 18:00', 50, 54, null),
    (3, 2, 1, 10, null, '2026-01-01 06:30', '2026-01-01 09:00', 70, 72, null),
    (4, 2, 1, 10, null, '2025-12-01 10:00', '2025-12-01 10:30', 0, 0, null),
    (5, 2, 1, 10, null, '2022-02-01 10:00', '2022-02-01 10:30', 0, 0, null),
    (6, 1, 1, 10, null, '2021-02-01 10:00', '2021-02-01 10:30', 80, 82, null)
`;

function sessions(prices: ChargePrices = noPrices) {
  return chargeSessionsRelation(sql, 2, prices);
}

async function years(timeZone: string): Promise<number[]> {
  const rows = await dataYearsQuery(sql, {
    carId: 2,
    timeZone,
    sessions: sessions(),
  });
  return rows.map((row) => row.year);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(drives);
  await db.exec(addresses);
  await db.exec(geofences);
  await db.exec(processes);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("dataYearsQuery", () => {
  test("lists the local years of the drives and charges of one car, newest first", async () => {
    expect(await years(phoenix)).toEqual([2025, 2024]);
  });

  test("puts a drive at the turn of the year into the local year", async () => {
    expect(await years("UTC")).toEqual([2026, 2025, 2024]);
  });
});

describe("biggestChargeQuery", () => {
  test("counts a charge on the local New Year's Eve in the old year", async () => {
    const [row] = await biggestChargeQuery(sql, {
      ...year2025,
      sessions: sessions(),
    });
    expect(row?.id).toBe(3);
    expect(row?.addedKwh).toBe(70);
    expect(row?.startAt.toISOString()).toBe("2026-01-01T06:30:00.000Z");
  });

  test("leaves the next local year without that charge", async () => {
    const [row] = await biggestChargeQuery(sql, {
      from: year2025.to,
      to: new Date("2027-01-01T07:00:00Z"),
      sessions: sessions(),
    });
    expect(row).toBeUndefined();
  });

  test("takes the earlier charge of two equal ones, with its place", async () => {
    const [row] = await biggestChargeQuery(sql, {
      from: year2025.from,
      to: new Date("2025-12-01T07:00:00Z"),
      sessions: sessions(),
    });
    expect(row?.id).toBe(1);
    expect(row?.cost).toBe(20);
    expect(row?.place).toEqual({
      geofence: null,
      name: "Supercharger",
      road: "Main Street",
      houseNumber: null,
      city: "Tempe",
    });
  });

  test("takes the cost from the price in Settings like the other charge pages", async () => {
    const [row] = await biggestChargeQuery(sql, {
      from: new Date("2025-07-01T07:00:00Z"),
      to: new Date("2025-12-01T07:00:00Z"),
      sessions: sessions({ perKwh: 0.3, fastPerKwh: null }),
    });
    expect(row?.id).toBe(2);
    expect(row?.cost).toBe(16.2);
    expect(row?.place.geofence).toBe("Home");
  });
});
