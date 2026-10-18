import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { noPrices, type ChargePrices } from "./charge-cost";
import { chargeSessionsRelation } from "./charge-sessions-sql";
import { demoSchema } from "./demo/schema";
import { createSql } from "./sql-template";

let db: PGlite;
let sql: postgres.Sql;

const processes = `
  insert into charging_processes
    (id, car_id, position_id, start_date, end_date, charge_energy_added,
     charge_energy_used, start_battery_level, end_battery_level, duration_min, cost)
  values
    (1, 2, 1, '2026-10-01 10:00', '2026-10-01 12:00', 10, 11, 40, 55, 120, null),
    (2, 2, 1, '2026-10-02 10:00', '2026-10-02 10:30', 30, 31, 20, 70, 30, 7.50),
    (3, 2, 1, '2026-10-02 14:00', '2026-10-02 14:20', 20, 21, 30, 60, 20, null),
    (4, 2, 1, '2026-10-04 17:33', null, null, null, null, null, null, null),
    (5, 2, 1, '2026-10-04 21:24', null, null, null, null, null, null, null),
    (6, 1, 1, '2026-10-05 08:00', null, null, null, null, null, null, null)
`;

const charges = `
  insert into charges
    (id, charging_process_id, date, battery_level, charge_energy_added,
     charger_power, charger_phases, charger_actual_current, charger_voltage,
     fast_charger_present, ideal_battery_range_km, rated_battery_range_km,
     outside_temp)
  values
    (1, 2, '2026-10-02 10:00', 20, 0, 120, null, 300, 400, true, 90, 90, 18),
    (2, 3, '2026-10-02 14:00', 30, 0, 110, null, 290, 400, true, 130, 130, 18),
    (3, 4, '2026-10-04 17:33', 39, 0, 3, 1, 13, 230, false, 170, 170, 20),
    (4, 4, '2026-10-04 19:33', 47, 5, 3, 1, 13, 230, false, 205, 205, 19),
    (5, 4, '2026-10-04 21:23', 54, 9.46, 3, 1, 13, 230, false, 236, 236, 18),
    (6, 5, '2026-10-04 21:24', 54, 9.46, 3, 1, 13, 230, false, 236, 236, 18)
`;

const pricedCar = `
  insert into car_settings (id, free_supercharging) values (30, true);
  insert into cars (id, eid, vid, inserted_at, updated_at, vin, settings_id)
    values (3, 3, 3, now(), now(), 'VIN3', 30);
  insert into geofences
    (id, name, latitude, longitude, inserted_at, updated_at, cost_per_unit,
     session_fee, billing_type)
  values
    (1, 'Office', 1, 1, now(), now(), 0.25, 1.50, 'per_minute'),
    (2, 'Garage', 1, 1, now(), now(), 0.30, null, 'per_kwh'),
    (3, 'Club', 1, 1, now(), now(), null, 4.00, 'per_kwh');
  insert into charging_processes
    (id, car_id, position_id, geofence_id, start_date, end_date,
     charge_energy_added, charge_energy_used, duration_min, cost)
  values
    (31, 3, 1, null, '2026-10-06 10:00', '2026-10-06 10:30', 40, 42, 30, null),
    (32, 3, 1, 1, '2026-10-06 12:00', '2026-10-06 13:00', 10, 11, 60, null),
    (33, 3, 1, 2, '2026-10-06 14:00', '2026-10-06 15:00', 10, 12, 60, null),
    (34, 3, 1, 3, '2026-10-06 16:00', '2026-10-06 17:00', 10, 11, 60, null),
    (35, 3, 1, 1, '2026-10-06 18:00', '2026-10-06 19:00', 10, 11, 60, 9.99),
    (36, 3, 1, null, '2026-10-06 20:00', '2026-10-06 20:30', 30, 31, 30, null);
  insert into charges
    (id, charging_process_id, date, battery_level, charge_energy_added,
     charger_power, ideal_battery_range_km, fast_charger_present,
     fast_charger_type)
  values
    (31, 31, '2026-10-06 10:00', 20, 0, 150, 90, true, 'Tesla'),
    (36, 36, '2026-10-06 20:00', 20, 0, 150, 90, true, 'CCS');
`;

type SessionRow = {
  id: number;
  endAt: Date | null;
  addedKwh: number | null;
  usedKwh: number | null;
  startLevel: number | null;
  endLevel: number | null;
  durationMin: number | null;
  startRangeKm: number | null;
  endRangeKm: number | null;
  outsideC: number | null;
  billedKwh: number | null;
  cost: number | null;
  estimated: boolean;
  basis: string | null;
  unclosed: boolean;
};

async function sessions(
  prices: ChargePrices,
  carId = 2,
): Promise<SessionRow[]> {
  return sql<SessionRow[]>`
    select
      cp.id::int as id,
      cp.end_date as "endAt",
      cp.charge_energy_added::float8 as "addedKwh",
      cp.charge_energy_used::float8 as "usedKwh",
      cp.start_battery_level::int as "startLevel",
      cp.end_battery_level::int as "endLevel",
      cp.duration_min::int as "durationMin",
      cp.start_rated_range_km::float8 as "startRangeKm",
      cp.end_rated_range_km::float8 as "endRangeKm",
      cp.outside_temp_avg::float8 as "outsideC",
      cp.billed_kwh::float8 as "billedKwh",
      cp.cost::float8 as cost,
      cp.cost_estimated as estimated,
      cp.cost_basis as basis,
      cp.unclosed
    from ${chargeSessionsRelation(sql, carId, prices)} cp
    order by cp.start_date
  `;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(demoSchema);
  await db.exec(processes);
  await db.exec(charges);
  await db.exec(pricedCar);
  sql = createSql(
    async (text, params) => (await db.query(text, params)).rows as never,
  ) as unknown as postgres.Sql;
});

afterAll(async () => {
  await db.close();
});

describe("chargeSessionsRelation", () => {
  test("keeps the rows of one car", async () => {
    const rows = await sessions(noPrices);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
  });

  test("fills a charge that a later charge left open", async () => {
    const unclosed = (await sessions(noPrices)).find((row) => row.id === 4);
    expect(unclosed?.unclosed).toBe(true);
    expect(unclosed?.endAt?.toISOString()).toBe("2026-10-04T21:23:00.000Z");
    expect(unclosed?.addedKwh).toBe(9.46);
    expect(unclosed?.startLevel).toBe(39);
    expect(unclosed?.endLevel).toBe(54);
    expect(unclosed?.durationMin).toBe(230);
    expect(unclosed?.startRangeKm).toBe(170);
    expect(unclosed?.endRangeKm).toBe(236);
    expect(unclosed?.outsideC).toBe(19);
    expect(unclosed?.usedKwh).toBeCloseTo(2.99 * (2 + 110 / 60), 6);
  });

  test("keeps the latest open charge as a charge in progress", async () => {
    const latest = (await sessions(noPrices)).find((row) => row.id === 5);
    expect(latest?.unclosed).toBe(false);
    expect(latest?.endAt).toBeNull();
    expect(latest?.addedKwh).toBeNull();
    expect(latest?.cost).toBeNull();
  });

  test("keeps the recorded costs without a price", async () => {
    const rows = await sessions(noPrices);
    expect(rows.map((row) => row.cost)).toEqual([null, 7.5, null, null, null]);
    expect(rows.some((row) => row.estimated)).toBe(false);
  });

  test("prices the energy from the charger when TeslaMate has no cost", async () => {
    const rows = await sessions({ perKwh: 2, fastPerKwh: null });
    expect(rows.map((row) => row.cost)).toEqual([22, 7.5, 42, 22.92, null]);
    expect(rows.map((row) => row.estimated)).toEqual([
      true,
      false,
      true,
      true,
      false,
    ]);
  });

  test("uses the fast charging price at a DC charger", async () => {
    const rows = await sessions({ perKwh: 2, fastPerKwh: 5 });
    expect(rows.map((row) => row.cost)).toEqual([22, 7.5, 105, 22.92, null]);
  });

  test("prices only the DC charges when only that price is set", async () => {
    const rows = await sessions({ perKwh: null, fastPerKwh: 5 });
    expect(rows.map((row) => row.cost)).toEqual([null, 7.5, 105, null, null]);
  });

  test("follows TeslaMate: free Supercharging, then the geofence, then your price", async () => {
    const rows = await sessions({ perKwh: 2, fastPerKwh: 5 }, 3);
    expect(
      rows.map(({ id, cost, estimated, basis }) => [
        id,
        cost,
        estimated,
        basis,
      ]),
    ).toEqual([
      [31, 0, false, "free"],
      [32, 16.5, true, "per_minute"],
      [33, 3.6, true, "per_kwh"],
      [34, 4, true, "per_kwh"],
      [35, 9.99, false, "recorded"],
      [36, 155, true, "price"],
    ]);
  });
});
