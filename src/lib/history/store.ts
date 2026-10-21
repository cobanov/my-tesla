import type { DatabaseSync } from "node:sqlite";
import { inTransaction, openDatabase } from "../sqlite";

type HistoryKind = "locked" | "sentry";

export type HistoryEvent = { kind: HistoryKind; value: boolean; at: number };

export type LastValues = Record<HistoryKind, boolean | null>;

const migrations = [
  `
  create table car_events (
    id integer primary key,
    car_id integer not null,
    kind text not null check (kind in ('locked', 'sentry')),
    value integer not null check (value in (0, 1)),
    at integer not null
  );
  create index car_events_by_car on car_events (car_id, at desc);
  `,
];

type Row = { kind: string; value: number; at: number };

function eventOf(row: Row): HistoryEvent {
  return {
    kind: row.kind === "sentry" ? "sentry" : "locked",
    value: row.value === 1,
    at: Number(row.at),
  };
}

export class HistoryStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = openDatabase(path, migrations);
  }

  last(carId: number): LastValues {
    const rows = this.db
      .prepare(
        `select kind, value, at from car_events e
         where car_id = ? and at = (
           select max(at) from car_events
           where car_id = e.car_id and kind = e.kind
         )`,
      )
      .all(carId) as Row[];
    const last: LastValues = { locked: null, sentry: null };
    for (const event of rows.map(eventOf)) last[event.kind] = event.value;
    return last;
  }

  record(carId: number, events: HistoryEvent[]): void {
    if (!events.length) return;
    inTransaction(this.db, () => {
      const insert = this.db.prepare(
        "insert into car_events (car_id, kind, value, at) values (?, ?, ?, ?)",
      );
      for (const event of events) {
        insert.run(carId, event.kind, event.value ? 1 : 0, event.at);
      }
    });
  }

  recent(carId: number, since: number, limit: number): HistoryEvent[] {
    return (
      this.db
        .prepare(
          "select kind, value, at from car_events where car_id = ? and at >= ? order by at desc, id desc limit ?",
        )
        .all(carId, since, limit) as Row[]
    ).map(eventOf);
  }

  prune(before: number): void {
    this.db.prepare("delete from car_events where at < ?").run(before);
  }

  close(): void {
    this.db.close();
  }
}
