import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { demoSchema } from "./demo/schema";
import { createSql } from "./sql-template";
import { visitedAreasQuery, type VisitedAreaRow } from "./visited-areas-sql";

let db: PGlite;
let sql: postgres.Sql;

const addresses = `
  insert into addresses (id, city, state, country, inserted_at, updated_at)
  values
    (1, 'Tempe', 'Arizona', 'United States', now(), now()),
    (2, 'Tempe', 'Arizona', 'United States', now(), now()),
    (3, 'Phoenix', 'Arizona', 'United States', now(), now()),
    (4, 'Flagstaff', 'Arizona', 'United States', now(), now()),
    (5, 'Las Vegas', 'Nevada', 'United States', now(), now()),
    (6, null, null, 'Mexico', now(), now()),
    (7, 'Old Town', 'Arizona', 'United States', now(), now()),
    (8, 'Other Car Town', 'Utah', 'United States', now(), now()),
    (9, 'Kingman', 'Arizona', 'United States', now(), now())
`;

const drives = `
  insert into drives
    (id, car_id, start_date, end_date, start_address_id, end_address_id)
  values
    (1, 1, '2026-10-01 08:00', '2026-10-01 08:30', 1, 3),
    (2, 1, '2026-10-01 17:00', '2026-10-01 17:30', 3, 2),
    (3, 1, '2026-10-02 08:00', null, 2, null),
    (4, 1, '2026-08-01 08:00', '2026-08-01 10:00', 7, 4),
    (5, 1, '2026-09-30 22:00', '2026-10-01 02:00', 4, 5),
    (6, 2, '2026-10-01 08:00', '2026-10-01 09:00', 8, 8)
`;

const charges = `
  insert into charging_processes (id, car_id, position_id, start_date, end_date, address_id)
  values
    (1, 1, 1, '2026-10-03 10:00', '2026-10-03 11:00', 6),
    (2, 1, 1, '2026-09-30 23:00', '2026-10-01 01:00', 9),
    (3, 2, 1, '2026-10-03 10:00', '2026-10-03 11:00', 8)
`;

function areas(carId: number, since: string): Promise<VisitedAreaRow[]> {
  return visitedAreasQuery(sql, { carId, since: new Date(since) });
}

function sorted(rows: VisitedAreaRow[]) {
  return rows
    .map((row) => [row.country, row.state, row.city, row.places])
    .sort((a, b) => String(a).localeCompare(String(b)));
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  for (const statement of [addresses, drives, charges]) {
    await db.exec(statement);
  }
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("visitedAreasQuery", () => {
  test("counts each address of a drive or a charge once, by city", async () => {
    expect(sorted(await areas(1, "2026-10-01T00:00:00Z"))).toEqual([
      ["Mexico", null, null, 1],
      ["United States", "Arizona", "Kingman", 1],
      ["United States", "Arizona", "Phoenix", 1],
      ["United States", "Arizona", "Tempe", 2],
      ["United States", "Nevada", "Las Vegas", 1],
    ]);
  });

  test("keeps a drive or a charge that ends inside the period", async () => {
    const rows = await areas(1, "2026-09-30T23:30:00Z");
    expect(rows.find((row) => row.city === "Flagstaff")).toBeUndefined();
    expect(rows.find((row) => row.city === "Las Vegas")?.places).toBe(1);
    expect(rows.find((row) => row.city === "Kingman")?.places).toBe(1);
    const fromEvening = await areas(1, "2026-09-30T21:00:00Z");
    expect(fromEvening.find((row) => row.city === "Flagstaff")?.places).toBe(1);
  });

  test("reaches back to the first record for the whole history", async () => {
    const rows = await areas(1, "1970-01-01T00:00:00Z");
    expect(rows.find((row) => row.city === "Old Town")?.places).toBe(1);
    expect(rows.reduce((sum, row) => sum + row.places, 0)).toBe(8);
  });

  test("keeps the places of one car", async () => {
    expect(sorted(await areas(2, "1970-01-01T00:00:00Z"))).toEqual([
      ["United States", "Utah", "Other Car Town", 1],
    ]);
  });
});
