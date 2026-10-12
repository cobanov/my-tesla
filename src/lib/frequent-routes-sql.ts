import type postgres from "postgres";
import type { RangeKind } from "./range-columns";
import type { PlaceParts } from "./vehicle";

const placeRadiusM = 250;
const metersPerDegree = 111_320;
const cellDegrees = (2 * placeRadiusM) / metersPerDegree;
const fewestDrives = 3;
const shortestDriveKm = 1;
const plausibleWhPerKm = { from: 50, to: 600 };

export type FrequentRouteRow = {
  key: string;
  drives: number;
  typicalKm: number;
  typicalMin: number;
  fastestMin: number;
  slowestMin: number;
  fastestId: number;
  slowestId: number;
  whPerKm: number | null;
  usualHour: number;
  lastAt: Date;
  from: PlaceParts;
  to: PlaceParts;
};

function cellKey(
  sql: postgres.Sql,
  geofence: string,
  row: string,
  lon: string,
) {
  return sql`coalesce(
    'g' || ${sql(geofence)},
    'c' || ${sql(row)} || ':' || floor(
      ${sql(lon)} / (
        ${cellDegrees}::float8
          / greatest(cos(radians(${sql(row)} * ${cellDegrees}::float8)), 0.01)
      )
    )
  )`;
}

function placeJson(sql: postgres.Sql, geofence: string, address: string) {
  return sql`json_build_object(
    'geofence', ${sql(`${geofence}.name`)},
    'name', ${sql(`${address}.name`)},
    'road', ${sql(`${address}.road`)},
    'houseNumber', ${sql(`${address}.house_number`)},
    'city', ${sql(`${address}.city`)}
  )`;
}

export function frequentRoutesQuery(
  sql: postgres.Sql,
  options: {
    carId: number;
    since: Date;
    timeZone: string;
    kind: RangeKind;
    limit: number;
  },
) {
  const startRange = sql(`d.start_${options.kind}_range_km`);
  const endRange = sql(`d.end_${options.kind}_range_km`);
  return sql<FrequentRouteRow[]>`
    with ends as (
      select
        d.id,
        d.start_date,
        d.distance,
        d.duration_min,
        greatest(${startRange} - ${endRange}, 0) * car.efficiency as kwh,
        extract(hour from
          (d.start_date at time zone 'UTC') at time zone ${options.timeZone}
        )::int as hour,
        d.start_address_id,
        d.end_address_id,
        d.start_geofence_id,
        d.end_geofence_id,
        floor(sp.latitude::float8 / ${cellDegrees}::float8) as start_row,
        sp.longitude::float8 as start_lon,
        floor(ep.latitude::float8 / ${cellDegrees}::float8) as end_row,
        ep.longitude::float8 as end_lon
      from drives d
      join cars car on car.id = d.car_id
      join positions sp on sp.id = d.start_position_id
      join positions ep on ep.id = d.end_position_id
      where d.car_id = ${options.carId}
        and d.end_date is not null
        and d.duration_min > 0
        and d.distance >= ${shortestDriveKm}
        and d.start_date >= (${options.since.toISOString()}::timestamptz at time zone 'UTC')
    ),
    keyed as (
      select
        e.*,
        ${cellKey(sql, "e.start_geofence_id", "e.start_row", "e.start_lon")}
          as start_key,
        ${cellKey(sql, "e.end_geofence_id", "e.end_row", "e.end_lon")}
          as end_key
      from ends e
    ),
    place_names as (
      select
        x.key,
        max(x.geofence_id) as geofence_id,
        mode() within group (order by x.address_id) as address_id
      from (
        select start_key as key, start_address_id as address_id,
          start_geofence_id as geofence_id
        from keyed
        union all
        select end_key, end_address_id, end_geofence_id
        from keyed
      ) x
      group by x.key
    ),
    routes as (
      select
        k.start_key,
        k.end_key,
        count(*)::int as drives,
        percentile_cont(0.5) within group (order by k.distance) as typical_km,
        percentile_cont(0.5) within group (order by k.duration_min)
          as typical_min,
        min(k.duration_min) as fastest_min,
        max(k.duration_min) as slowest_min,
        (array_agg(k.id order by k.duration_min, k.start_date desc))[1]
          as fastest_id,
        (array_agg(k.id order by k.duration_min desc, k.start_date desc))[1]
          as slowest_id,
        sum(k.kwh) filter (where k.kwh * 1000 / k.distance
          between ${plausibleWhPerKm.from} and ${plausibleWhPerKm.to}) as kwh,
        sum(k.distance) filter (where k.kwh * 1000 / k.distance
          between ${plausibleWhPerKm.from} and ${plausibleWhPerKm.to}) as km,
        mode() within group (order by k.hour) as usual_hour,
        max(k.start_date) as last_date
      from keyed k
      where k.start_key <> k.end_key
      group by k.start_key, k.end_key
      having count(*) >= ${fewestDrives}
    )
    select
      r.start_key || '>' || r.end_key as key,
      r.drives,
      r.typical_km::float8 as "typicalKm",
      r.typical_min::float8 as "typicalMin",
      r.fastest_min::int as "fastestMin",
      r.slowest_min::int as "slowestMin",
      r.fastest_id::int as "fastestId",
      r.slowest_id::int as "slowestId",
      (r.kwh * 1000 / nullif(r.km, 0))::float8 as "whPerKm",
      r.usual_hour::int as "usualHour",
      r.last_date at time zone 'UTC' as "lastAt",
      ${placeJson(sql, "sg", "sa")} as "from",
      ${placeJson(sql, "eg", "ea")} as "to"
    from routes r
    join place_names sn on sn.key = r.start_key
    join place_names en on en.key = r.end_key
    left join geofences sg on sg.id = sn.geofence_id
    left join addresses sa on sa.id = sn.address_id
    left join geofences eg on eg.id = en.geofence_id
    left join addresses ea on ea.id = en.address_id
    order by r.drives desc, r.last_date desc
    limit ${options.limit}
  `;
}
