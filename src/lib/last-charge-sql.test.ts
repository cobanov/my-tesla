import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { lastUsableCharge } from "./last-charge-sql";
import type { RangeKind } from "./range-columns";
import { createSql } from "./sql-template";

let db: PGlite;
let sql: postgres.Sql;

type ChargeRow = {
  session: number;
  ratedKm: number;
  preferredKm: number;
  usableLevel: number;
};

const charges = `
  insert into charging_processes (id, car_id, position_id, start_date)
  values
    (1, 1, 1, '2026-10-20 10:00'),
    (2, 1, 1, '2026-10-21 10:00'),
    (3, 1, 1, '2026-10-22 10:00');
  insert into charges
    (id, charging_process_id, date, charge_energy_added, charger_power,
     usable_battery_level, rated_battery_range_km, ideal_battery_range_km)
  values
    (1, 1, '2026-10-20 10:00', 0, 11, 50, 200, 210),
    (2, 1, '2026-10-20 10:45', 6, 11, 0, 999, 999),
    (3, 1, '2026-10-20 10:30', 4, 11, 60, 240, 250),
    (4, 1, '2026-10-20 10:50', 7, 11, null, 998, 998),
    (5, 2, '2026-10-21 10:00', 0, 11, 0, 300, 310),
    (6, 2, '2026-10-21 10:30', 2, 11, null, 310, 320)
`;

function lastCharges(kind: RangeKind): Promise<ChargeRow[]> {
  return sql<ChargeRow[]>`
    select
      cp.id::int as session,
      c.rated_battery_range_km::float8 as "ratedKm",
      c.preferred_range_km::float8 as "preferredKm",
      c.usable_battery_level::int as "usableLevel"
    from charging_processes cp
    join lateral (${lastUsableCharge(sql, sql`cp.id`, kind)}) c on true
    order by cp.id
  `;
}

function newestCharges(kind: RangeKind): Promise<ChargeRow[]> {
  return sql<ChargeRow[]>`
    select
      cp.id::int as session,
      c.rated_battery_range_km::float8 as "ratedKm",
      c.preferred_range_km::float8 as "preferredKm",
      c.usable_battery_level::int as "usableLevel"
    from charging_processes cp
    join lateral (
      select
        rated_battery_range_km,
        ${sql(`${kind}_battery_range_km`)} as preferred_range_km,
        usable_battery_level
      from charges
      where charging_process_id = cp.id and usable_battery_level > 0
      order by date desc
      limit 1
    ) c on true
    order by cp.id
  `;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(charges);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("lastUsableCharge", () => {
  test("takes the newest charge with a usable battery level", async () => {
    expect([...(await lastCharges("rated"))]).toEqual([
      { session: 1, ratedKm: 240, preferredKm: 240, usableLevel: 60 },
    ]);
  });

  test("takes the preferred range of the same charge", async () => {
    expect([...(await lastCharges("ideal"))]).toEqual([
      { session: 1, ratedKm: 240, preferredKm: 250, usableLevel: 60 },
    ]);
  });

  test("drops a session without a usable charge, as limit 1 does", async () => {
    for (const kind of ["rated", "ideal"] as const) {
      expect([...(await lastCharges(kind))]).toEqual([
        ...(await newestCharges(kind)),
      ]);
    }
  });
});
