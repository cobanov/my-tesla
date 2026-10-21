import type postgres from "postgres";
import type { chargeSessionsRelation } from "./charge-sessions-sql";
import type { PlaceParts } from "./vehicle";

type ChargeSessionsRelation = ReturnType<typeof chargeSessionsRelation>;

export type BiggestChargeRow = {
  id: number;
  startAt: Date;
  addedKwh: number;
  cost: number | null;
  place: PlaceParts;
};

function utcBound(sql: postgres.Sql, at: Date) {
  return sql`(${at.toISOString()}::timestamptz at time zone 'UTC')`;
}

export function dataYearsQuery(
  sql: postgres.Sql,
  options: {
    carId: number;
    timeZone: string;
    sessions: ChargeSessionsRelation;
  },
) {
  return sql<{ year: number }[]>`
    select distinct extract(year from
      (t.start_date at time zone 'UTC') at time zone ${options.timeZone}
    )::int as year
    from (
      select start_date
      from drives
      where car_id = ${options.carId} and end_date is not null
      union all
      select start_date
      from ${options.sessions} cp
      where charge_energy_added > 0.01
    ) t
    order by year desc
  `;
}

export function biggestChargeQuery(
  sql: postgres.Sql,
  options: { from: Date; to: Date; sessions: ChargeSessionsRelation },
) {
  return sql<BiggestChargeRow[]>`
    select
      cp.id::int as id,
      cp.start_date at time zone 'UTC' as "startAt",
      cp.charge_energy_added::float8 as "addedKwh",
      cp.cost::float8 as cost,
      json_build_object(
        'geofence', g.name, 'name', a.name, 'road', a.road,
        'houseNumber', a.house_number, 'city', a.city
      ) as place
    from ${options.sessions} cp
    left join geofences g on g.id = cp.geofence_id
    left join addresses a on a.id = cp.address_id
    where cp.charge_energy_added > 0.01
      and cp.start_date >= ${utcBound(sql, options.from)}
      and cp.start_date < ${utcBound(sql, options.to)}
    order by cp.charge_energy_added desc, cp.start_date
    limit 1
  `;
}
