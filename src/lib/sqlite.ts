import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function inTransaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("begin immediate");
  try {
    const result = work();
    db.exec("commit");
    return result;
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function openDatabase(
  path: string,
  migrations: readonly string[],
): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("pragma foreign_keys = on; pragma busy_timeout = 5000;");
  if (path !== ":memory:") db.exec("pragma journal_mode = wal;");
  let pending = true;
  while (pending) {
    pending = inTransaction(db, () => {
      const row = db.prepare("pragma user_version").get() as {
        user_version: number;
      };
      const sql = migrations[Number(row.user_version)];
      if (sql === undefined) return false;
      db.exec(sql);
      db.exec(`pragma user_version = ${Number(row.user_version) + 1}`);
      return true;
    });
  }
  return db;
}

export function openPrivately<T>(path: string, open: (path: string) => T): T {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const previous = process.umask(0o077);
  try {
    return open(path);
  } finally {
    process.umask(previous);
  }
}

export function processWide<T>(name: string, create: () => T): T {
  const registry = globalThis as unknown as Record<symbol, T | undefined>;
  const key = Symbol.for(`my-tesla.${name}`);
  registry[key] ??= create();
  return registry[key];
}
