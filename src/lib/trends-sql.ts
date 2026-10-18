import type postgres from "postgres";
import type { RangeKind } from "./range-columns";
import type { LevelTrendPoint, RangeGroup, StateTime } from "./trends";

const trendPoints = 240;

function utc(sql: postgres.Sql, date: Date) {
  return sql`(${date.toISOString()}::timestamptz at time zone 'UTC')`;
}

export function chargeLevelTrendQuery(
  sql: postgres.Sql,
  carId: number,
  since: Date,
  points = trendPoints,
) {
  return sql<LevelTrendPoint[]>`
    with samples as (
      select
        extract(epoch from date)::float8 as t,
        battery_level,
        coalesce(usable_battery_level, battery_level) as usable_level
      from positions
      where car_id = ${carId}
        and ideal_battery_range_km is not null
        and battery_level is not null
        and date >= ${utc(sql, since)}
    ),
    bounds as (select min(t) as first, max(t) + 1 as last from samples)
    select
      to_timestamp(avg(s.t)) as at,
      avg(s.battery_level)::float8 as level,
      avg(s.usable_level)::float8 as "usableLevel"
    from samples s
    cross join bounds b
    group by width_bucket(s.t, b.first, b.last, ${points}::int)
    order by 1
  `;
}

function rangeSamples(
  sql: postgres.Sql,
  carId: number,
  since: Date,
  kind: RangeKind,
) {
  const range = (alias: string) => sql(`${alias}.${kind}_battery_range_km`);
  return sql`
    select
      p.battery_level,
      coalesce(p.usable_battery_level, p.battery_level) as usable_level,
      ${range("p")} as range_km,
      p.outside_temp
    from positions p
    where p.car_id = ${carId}
      and p.ideal_battery_range_km is not null
      and ${range("p")} is not null
      and p.battery_level > 0
      and p.date >= ${utc(sql, since)}
    union all
    select
      c.battery_level,
      coalesce(c.usable_battery_level, c.battery_level),
      ${range("c")},
      c.outside_temp
    from charges c
    join charging_processes cp on cp.id = c.charging_process_id
    where cp.car_id = ${carId}
      and ${range("c")} is not null
      and c.battery_level > 0
      and c.date >= ${utc(sql, since)}
  `;
}

function rangeGroups(
  sql: postgres.Sql,
  samples: ReturnType<typeof rangeSamples>,
  value: ReturnType<typeof rangeSamples>,
) {
  return sql<RangeGroup[]>`
    select
      ${value}::int as value,
      count(*)::int as samples,
      sum(range_km)::float8 as "rangeKm",
      sum(battery_level)::float8 as level,
      sum(usable_level)::float8 as "usableLevel"
    from (${samples}) s
    where ${value} is not null
    group by 1
    order by 1
  `;
}

export function rangeByTemperatureQuery(
  sql: postgres.Sql,
  carId: number,
  since: Date,
  kind: RangeKind,
) {
  return rangeGroups(
    sql,
    rangeSamples(sql, carId, since, kind),
    sql`round(outside_temp)`,
  );
}

export function rangeByLevelQuery(
  sql: postgres.Sql,
  carId: number,
  since: Date,
  kind: RangeKind,
) {
  return rangeGroups(
    sql,
    rangeSamples(sql, carId, since, kind),
    sql`battery_level`,
  );
}

export function stateTimesQuery(
  sql: postgres.Sql,
  carId: number,
  since: Date,
  until: Date,
) {
  const from = utc(sql, since);
  const to = utc(sql, until);
  return sql<StateTime[]>`
    select
      state::text as state,
      sum(extract(epoch from (
        least(coalesce(end_date, ${to}), ${to}) - greatest(start_date, ${from})
      )))::float8 as seconds
    from states
    where car_id = ${carId}
      and start_date < ${to}
      and (end_date is null or end_date > ${from})
    group by state
    order by state
  `;
}
