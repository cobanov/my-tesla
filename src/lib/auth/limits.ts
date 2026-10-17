const minute = 60_000;
const day = 24 * 60 * minute;
const maxEntries = 10_000;

function bounded<T>(map: Map<string, T>, key: string, value: T): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

type Entry = { failures: number; blockedUntil: number; firstAt: number };

export class Backoff {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly free = 5,
    private readonly baseMs = 1000,
    private readonly maxMs = 15 * minute,
    private readonly forgetMs = day,
  ) {}

  waitMs(key: string, now: number): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (now - entry.firstAt > this.forgetMs) {
      this.entries.delete(key);
      return 0;
    }
    return Math.max(0, entry.blockedUntil - now);
  }

  fail(key: string, now: number): void {
    const current = this.entries.get(key);
    const entry =
      current && now - current.firstAt <= this.forgetMs
        ? current
        : { failures: 0, blockedUntil: 0, firstAt: now };
    entry.failures += 1;
    const over = entry.failures - this.free;
    if (over > 0) {
      entry.blockedUntil =
        now + Math.min(this.maxMs, this.baseMs * 2 ** Math.min(over - 1, 30));
    }
    bounded(this.entries, key, entry);
  }

  succeed(key: string): void {
    this.entries.delete(key);
  }
}

export class FailureCap {
  private readonly counts = new Map<string, { count: number; since: number }>();

  constructor(private readonly limit: number) {}

  blocked(key: string, now: number): boolean {
    const entry = this.counts.get(key);
    if (!entry) return false;
    if (now - entry.since >= day) {
      this.counts.delete(key);
      return false;
    }
    return entry.count >= this.limit;
  }

  fail(key: string, now: number): void {
    const entry = this.counts.get(key);
    const next =
      entry && now - entry.since < day
        ? { count: entry.count + 1, since: entry.since }
        : { count: 1, since: now };
    bounded(this.counts, key, next);
  }
}

export function waitText(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
