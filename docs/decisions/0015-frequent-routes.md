# 0015: Frequent routes by place

Date: 2026-10-12

Status: Accepted.

## Context

Places listed where the car parks. No page listed the routes that the car drives again and again, such as a commute. teslamate-mcp is adding a tool for these routes, and the dashboard reads the same database.

## Decision

1. A route is all drives of the period from one place to another place, with 3 drives or more. Each direction is its own route. Drives below 1 km do not count.
2. A place is the TeslaMate geofence of the drive. Without a geofence, it is a grid cell of about 500 m around the first or the last position of the drive. The place name is the address that most drives there have.
3. Each route shows the median distance and duration, the fastest and the slowest drive with a link, the consumption, and the hour in which most of its drives start. The hour is in the time zone of the user.
4. The consumption leaves out a drive below 50 Wh/km or above 600 Wh/km. Such a value comes from a new range estimate, not from the drive.
5. The panel shows the 8 routes with the most drives.
6. `frequentRoutesQuery()` takes the `sql` tag as a parameter, so that a PGlite test can run it.

## Alternatives

1. A route by address id. TeslaMate gives parking spots a few meters apart different addresses, so one parking lot gives many routes with one drive each.
2. A cluster of positions. It needs more than one pass over the drives, and the grid gives the same result for most places.

## Consequences

A parking spot at the edge of a cell can split a place in two. A geofence in TeslaMate for that place fixes this.
