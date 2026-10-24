# 0026: No JIT compilation

Date: 2026-10-23

Status: Accepted.

## Context

PostgreSQL compiles a query with LLVM when the planner estimates a cost above `jit_above_cost`, 100,000 by default, and optimizes and inlines it above 500,000. The lateral joins of the drive sessions give an estimate far above the real work. On a TeslaMate database with 2,244 drives and 4.26 million positions, on PostgreSQL 18.6 with the default settings, the list of 50 drives spent 1,174 ms of 1,189 ms in JIT and 3 ms in execution. Drives runs that query twice, for the list and for the drives of the trips, so the server answered Drives in 2.6 s.

## Decision

Every session sets `jit = off` with the other connection settings in `database.ts`. The queries of the dashboard are short reads, where the compilation costs more than it saves.

## Alternatives

1. A higher `jit_above_cost`. The estimates of the lateral queries grow with the data, so any fixed limit fails on a larger database.
2. `ALTER ROLE teslamate_ro SET jit = off` in the database guide. It works, but every install would need the step, and the connection setting also covers a role made without it.

## Consequences

- With the same database, the drive list takes 3 ms and the server answers Drives in about 0.1 s.
- A query that would gain from JIT, a long scan with heavy expressions, does not get it. The dashboard has none today.
