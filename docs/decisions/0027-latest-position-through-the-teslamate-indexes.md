# 0027: The latest position through the TeslaMate indexes

Date: 2026-10-23

Status: Accepted.

## Context

TeslaMate has no B-tree index on `positions (car_id, date)`. Its migrations replaced the B-tree indexes on `date` and on `(drive_id, date)` with BRIN indexes, and added a partial index on `(car_id, date)` where `ideal_battery_range_km is not null`. The demo schema still has a B-tree on `(car_id, date)`, so the demo data does not show the cost.

A query for the newest position of a car without the `ideal_battery_range_km is not null` predicate cannot use the partial index, and a BRIN index gives no order. On a database with 4.26 million positions, each such lookup read the whole table, in 0.5 s to 1 s. The Overview made three of them through `carSnapshot`, the start page one through `defaultCarId`, and Battery one through `batteryNow`.

## Decision

1. A lookup of the newest position first finds the newest position with `ideal_battery_range_km is not null` and the same condition, through the partial index. It then reads only the positions from that date on, through the BRIN index on `date`.
2. `latestRangedPositionDate` in `latest-position-sql.ts` builds that lower bound. It gives `-infinity` when the car has no such position, and the lookup then reads every position, as before.
3. The result is the row of the full scan. A newer row that matches the condition is never older than the newest ranged row that also matches it.

## Alternatives

1. A new index on `positions (car_id, date)`. The dashboard never writes to the database and works with the schema of TeslaMate as it is.
2. `order by id desc`. An import from TeslaFi inserts old positions with new ids, so the newest id is not always the newest date.

## Consequences

- `latest-position-sql.test.ts` compares the bound with a full scan: a newer row without a range, a battery level without a range, a tire pressure older than the last ranged row, a car with no ranged row, a car with no rows, and a bound that follows the car of the outer query.
- A new query for the newest position of a car uses `latestRangedPositionDate`, or it reads the whole table on a large database.
- The lookup reads the positions after the newest ranged one. On the database above, the median gap between two ranged positions of a car is 15 s and the 99th percentile is 39 min, and the newest ranged position was the newest position of both cars.
