import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { latestRangedPositionDate } from "./latest-position-sql";
import { createSql } from "./sql-template";

let db: PGlite;
let sql: postgres.Sql;

type IdRow = { id: number };

const positions = `
  insert into positions
    (id, car_id, date, latitude, longitude, battery_level,
     ideal_battery_range_km, tpms_pressure_fl)
  values
    (1, 1, '2026-10-20 10:00', 41.0, 29.0, 80, 300, 2.9),
    (2, 1, '2026-10-20 11:00', 41.1, 29.1, 78, 290, null),
    (3, 1, '2026-10-20 11:05', 41.2, 29.2, 77, null, null),
    (4, 1, '2026-10-20 11:06', 41.3, 29.3, null, null, null),
    (10, 2, '2026-10-19 09:00', 40.0, 28.0, 50, null, null),
    (11, 2, '2026-10-19 09:10', 40.1, 28.1, null, null, null)
`;

function latest(carId: number, condition = sql`true`): Promise<number[]> {
  return ids(sql<IdRow[]>`
    select id::int as id from positions
    where car_id = ${carId}
      and ${condition}
      and date >= ${latestRangedPositionDate(sql, carId, condition)}
    order by date desc
    limit 1
  `);
}

function scanned(carId: number, condition = sql`true`): Promise<number[]> {
  return ids(sql<IdRow[]>`
    select id::int as id from positions
    where car_id = ${carId} and ${condition}
    order by date desc
    limit 1
  `);
}

async function ids(query: PromiseLike<IdRow[]>): Promise<number[]> {
  return (await query).map((row) => row.id);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(positions);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("latestRangedPositionDate", () => {
  test("keeps a newer position without a range", async () => {
    expect(await latest(1)).toEqual([4]);
    expect(await latest(1)).toEqual(await scanned(1));
  });

  test("keeps a newer battery level without a range", async () => {
    const condition = sql`battery_level is not null`;
    expect(await latest(1, condition)).toEqual([3]);
    expect(await latest(1, condition)).toEqual(await scanned(1, condition));
  });

  test("finds a tire pressure older than the last ranged position", async () => {
    const condition = sql`tpms_pressure_fl is not null`;
    expect(await latest(1, condition)).toEqual([1]);
    expect(await latest(1, condition)).toEqual(await scanned(1, condition));
  });

  test("reads every position of a car without a ranged position", async () => {
    expect(await latest(2)).toEqual([11]);
    expect(await latest(2, sql`battery_level is not null`)).toEqual([10]);
  });

  test("finds nothing for a car without positions", async () => {
    expect(await latest(3)).toEqual([]);
  });

  test("follows the car of the outer query", async () => {
    const rows = await sql<{ car: number; id: number | null }[]>`
      select c.id::int as car, latest.id::int as id
      from (values (1), (2), (3)) as c(id)
      left join lateral (
        select p.id from positions p
        where p.car_id = c.id
          and p.date >= ${latestRangedPositionDate(sql, sql`c.id`)}
        order by p.date desc
        limit 1
      ) latest on true
      order by c.id
    `;
    expect([...rows]).toEqual([
      { car: 1, id: 4 },
      { car: 2, id: 11 },
      { car: 3, id: null },
    ]);
  });
});
